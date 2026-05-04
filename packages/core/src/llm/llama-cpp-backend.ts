/**
 * LlamaCppBackend — `LlmBackend` implementation that runs a GGUF model
 * in-process via `node-llama-cpp` v3.
 *
 * Removes the Ollama daemon dependency entirely (see
 * `docs/scope-memos/v0.4.0-llama-cpp-backend-2026-05-04.md` and
 * `docs/prior-art/llama-cpp-backend-2026-05-04.md`).
 *
 * Lifecycle: model + context are loaded lazily on first `chat`/`countTokens`
 * call (the `getLlama()` boot is non-trivial — Metal init, weights mmap).
 * `backend-factory.ts` memoizes instances per modelPath so subsequent calls
 * reuse the loaded model. The bridge process holds the loaded weights for
 * its lifetime; OS reaps everything on shutdown.
 *
 * Concurrency: a single `LlamaContext` runs one prompt at a time (it
 * serializes internally on a `LlamaContextSequence`). This matches Ollama's
 * Metal-serialized behavior on the same hardware — concurrent MCP calls
 * already queue, so in-process queueing here is functionally equivalent.
 *
 * Token counting: exact, via `model.tokenize(text).length`. No proxy drift.
 */

import type {
  Llama,
  LlamaModel,
  LlamaContext,
  LlamaGrammar,
} from 'node-llama-cpp';
import type { LlmBackend, ChatOptions, ChatResult } from './backend.js';

export interface LlamaCppBackendOptions {
  /** Absolute path to the GGUF model file. */
  modelPath: string;
  /**
   * Context window size in tokens. Fixed at context-creation time — unlike
   * Ollama's per-call `num_ctx`, llama.cpp pre-allocates KV cache for the
   * declared size. Pick the largest size the tier ever needs.
   */
  contextSize: number;
}

export class LlamaCppBackend implements LlmBackend {
  private llama: Llama | null = null;
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  // Serialize chat() calls — a single context can only run one prompt
  // at a time. Without this, a second MCP request that arrives mid-prompt
  // would race against the first on the same sequence.
  private chatChain: Promise<unknown> = Promise.resolve();
  // Single in-flight load promise — concurrent ensureLoaded() callers
  // (e.g. parallel chat + countTokens before the first load completes)
  // share one boot, no double-load.
  private loadingPromise: Promise<void> | null = null;
  private disposed = false;

  constructor(private readonly opts: LlamaCppBackendOptions) {}

  get modelId(): string {
    const fileName = this.opts.modelPath.split('/').pop() ?? 'unknown.gguf';
    return `llama-cpp:${fileName}`;
  }

  /**
   * Lazy boot. Idempotent — safe to call repeatedly. Concurrent callers
   * share a single boot via `loadingPromise` (double-checked lock pattern).
   * On boot failure, partially-allocated resources are cleaned up before
   * the error rethrows so the next call can retry from a clean state.
   */
  private async ensureLoaded(): Promise<void> {
    if (this.disposed) {
      throw new Error('llama-cpp backend disposed');
    }
    if (this.context !== null) return;
    if (this.loadingPromise !== null) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const { getLlama } = await import('node-llama-cpp');
        this.llama = await getLlama();
        this.model = await this.llama.loadModel({
          modelPath: this.opts.modelPath,
        });
        this.context = await this.model.createContext({
          contextSize: this.opts.contextSize,
        });
      } catch (err) {
        // Clean up any partial state so next call retries from scratch
        // rather than seeing half-initialized model/llama instances.
        if (this.context !== null) {
          try {
            this.context.dispose();
          } catch {
            /* swallow — re-disposal protection */
          }
          this.context = null;
        }
        if (this.model !== null) {
          try {
            await this.model.dispose();
          } catch {
            /* swallow */
          }
          this.model = null;
        }
        this.llama = null;
        throw err;
      } finally {
        this.loadingPromise = null;
      }
    })();
    return this.loadingPromise;
  }

  async chat(opts: ChatOptions, signal?: AbortSignal): Promise<ChatResult> {
    // Queue behind any in-flight chat on this backend's single context.
    // We chain on the previous tail's settlement, then run our own work
    // and become the new tail. Errors on prior calls don't poison the chain.
    const prev = this.chatChain;
    let release!: () => void;
    this.chatChain = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await prev.catch(() => {});
      return await this._chatSerialized(opts, signal);
    } finally {
      release();
    }
  }

  private async _chatSerialized(
    opts: ChatOptions,
    signal?: AbortSignal,
  ): Promise<ChatResult> {
    if (signal?.aborted) {
      throw new Error('aborted before start');
    }
    await this.ensureLoaded();
    const { LlamaChatSession } = await import('node-llama-cpp');

    // Fresh sequence per call — keeps each chat hermetic, no carry-over
    // from a prior request's chat history. Sequences are cheap on a
    // single context.
    const sequence = this.context!.getSequence();
    const session = new LlamaChatSession({
      contextSequence: sequence,
      systemPrompt: opts.system,
    });

    let grammar: LlamaGrammar | undefined;
    if (opts.format !== undefined) {
      // node-llama-cpp's createGrammarForJsonSchema accepts a JSON Schema
      // object and returns a LlamaGrammar. Schema audit (2026-05-04)
      // confirmed all current classify/extract schemas compile.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grammar = (await this.llama!.createGrammarForJsonSchema(
        opts.format as any,
      )) as unknown as LlamaGrammar;
    }

    // Count prompt tokens before generation (exact via model tokenizer).
    // We approximate by tokenizing the rendered chat text; node-llama-cpp
    // doesn't surface a "post-render before generate" token count directly.
    const promptText =
      (opts.system ? opts.system + '\n' : '') + opts.user;
    const promptTokens = this.model!.tokenize(promptText).length;

    let completionText = '';
    let completionTokens = 0;
    try {
      completionText = await session.prompt(opts.user, {
        signal,
        stopOnAbortSignal: true,
        temperature: opts.temperature,
        maxTokens: opts.maxOutputTokens,
        grammar,
      });
      try {
        completionTokens = this.model!.tokenize(completionText).length;
      } catch {
        // Disposed model mid-call (race with dispose) — just return 0
        // for completion tokens rather than masking the real result.
        completionTokens = 0;
      }
    } finally {
      // Free the sequence's KV slots so subsequent calls don't accumulate.
      // Wrap in try/catch — some native disposes throw on double-dispose
      // or when the parent context is already gone.
      try {
        sequence.dispose();
      } catch {
        /* swallow — sequence already gone */
      }
    }

    return { text: completionText, promptTokens, completionTokens };
  }

  /**
   * Exact token count using the loaded model's tokenizer. No proxy drift.
   * Yields to the event loop on large inputs to keep MCP keep-alives flowing.
   */
  async countTokens(text: string): Promise<number> {
    if (text.length === 0) return 0;
    await this.ensureLoaded();
    // model.tokenize is sync C++ work; for very large inputs we slice and
    // yield. 200 KB ≈ 50 K tokens — single-call latency stays bounded.
    const SEGMENT = 200_000;
    let total = 0;
    for (let i = 0; i < text.length; i += SEGMENT) {
      total += this.model!.tokenize(text.slice(i, i + SEGMENT)).length;
      if (i + SEGMENT < text.length) {
        await new Promise<void>((r) => setImmediate(r));
      }
    }
    return total;
  }

  async ping(): Promise<void> {
    await this.ensureLoaded();
    if (this.model === null || this.model.disposed) {
      throw new Error('llama-cpp model not loaded');
    }
  }

  /**
   * Free model + context. After dispose(), this backend is unusable —
   * subsequent chat() / countTokens() / ping() calls throw.
   *
   * Awaits any in-flight chat queue tail so we don't free resources while
   * a native generation is still running on the context.
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    // Drain queued chats so we don't dispose mid-generation.
    await this.chatChain.catch(() => {});
    if (this.context !== null) {
      try {
        this.context.dispose();
      } catch {
        /* swallow — re-disposal */
      }
      this.context = null;
    }
    if (this.model !== null) {
      try {
        await this.model.dispose();
      } catch {
        /* swallow */
      }
      this.model = null;
    }
    this.llama = null;
  }
}
