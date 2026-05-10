/**
 * MlxHttpBackend — `LlmBackend` implementation that delegates inference to a
 * local MLX FastAPI bridge server over HTTP.
 *
 * The bridge server (`scripts/mlx-bridge-server.py`) exposes an
 * OpenAI-compatible `/v1/chat/completions` endpoint backed by `mlx-lm`.
 * Running the weights on Apple Silicon via MLX delivers 30-50 % better
 * decode throughput than llama.cpp/GGUF for 14B+ models — see
 * `docs/scope-memos/v0.5.0-tier-d-eval-2026-05-06.md` §D3 for the
 * benchmark data and integration rationale.
 *
 * Lifecycle: the bridge server is managed independently of the Node MCP
 * host. Users start it before launching the bridge:
 *   python scripts/mlx-bridge-server.py --model mlx-community/Qwen3-14B-4bit
 *
 * Concurrency: each `chat()` call is a separate HTTP request; the server
 * serializes them (mlx-lm runs one generation at a time). This mirrors
 * the behaviour of the in-process llama.cpp backend.
 *
 * Token counting: approximate — the exact tokenizer is not exposed over
 * HTTP. Returns `Math.ceil(text.length / 3.5)` (±15 % vs exact). The
 * chunker applies a safety margin on top of proxy counts, so this is safe.
 *
 * Grammar-constrained output: when `opts.format` (JSON Schema) is set,
 * the backend sends `response_format: { type: "json_schema", strict: true }`.
 * oMLX enforces the schema at decode time (verified 2026-05-07: enum
 * constraints binding, required fields produced) — equivalent to llama.cpp's
 * GBNF grammar. This is what makes oMLX viable as the unified backend for
 * classify and extract tools.
 *
 * See: docs/scope-memos/v0.5.0-tier-d-eval-2026-05-06.md
 */

import type { LlmBackend, ChatOptions, ChatResult } from './backend.js';

export interface MlxHttpBackendOptions {
  /**
   * Base URL of the MLX bridge server, e.g. `"http://127.0.0.1:8080"`.
   * No trailing slash.
   */
  baseUrl: string;
  /**
   * Context window size passed to the server in the request. Informational
   * only — the server-side model's context is fixed at load time. Used for
   * the `modelId` label and telemetry.
   */
  numCtx?: number;
  /**
   * Model name to pass in the `model` field of each OpenAI request.
   *
   * - Required by oMLX and other multi-model servers (model routing by name).
   * - Legacy mlx-bridge-server.py ignored this field (model fixed at startup).
   * - When omitted, auto-detected on first request via `GET /v1/models`
   *   and cached for the backend lifetime.
   */
  modelName?: string;
}

/** Shape of the OpenAI-compatible request sent to the bridge server. */
interface OpenAIChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  response_format?:
    | { type: 'text' | 'json_object' }
    | {
        type: 'json_schema';
        json_schema: {
          name: string;
          strict: true;
          schema: Record<string, unknown>;
        };
      };
}

/** Minimal subset of OpenAI response we consume. */
interface OpenAIChatResponse {
  choices: Array<{
    message: { content: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class MlxHttpBackend implements LlmBackend {
  private readonly baseUrl: string;
  private readonly configuredModelName?: string;
  /** Cached after first auto-detect or set from configuredModelName. */
  private resolvedModelName?: string;

  constructor(opts: MlxHttpBackendOptions) {
    // Normalise: strip trailing slash once so every endpoint path is clean.
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.configuredModelName = opts.modelName;
    // numCtx is informational — stored in TierConfig, not needed at call time
    // (server-side context is fixed at model load). Not retained here.
  }

  get modelId(): string {
    // Include resolved model name when available; fall back to base URL alone.
    const model = this.resolvedModelName ?? this.configuredModelName;
    return model ? `mlx-http:${this.baseUrl}/${model}` : `mlx-http:${this.baseUrl}`;
  }

  /**
   * Return the model name to pass in OpenAI requests.
   *
   * If `modelName` was supplied at construction time, use it directly.
   * Otherwise, query `GET /v1/models`, pick the first entry, and cache it
   * so subsequent calls skip the round-trip.
   */
  private async resolveModelName(): Promise<string> {
    if (this.resolvedModelName) return this.resolvedModelName;
    if (this.configuredModelName) {
      this.resolvedModelName = this.configuredModelName;
      return this.resolvedModelName;
    }
    // Auto-detect from server.
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/v1/models`, { method: 'GET' });
    } catch (err) {
      throw new Error(
        `MlxHttpBackend: /v1/models unreachable — ${(err as Error).message}`,
      );
    }
    if (!res.ok) {
      throw new Error(`MlxHttpBackend: /v1/models returned ${res.status}`);
    }
    const data = (await res.json()) as { data?: Array<{ id: string }> };
    const first = data.data?.[0]?.id;
    if (!first) {
      throw new Error('MlxHttpBackend: /v1/models returned empty list');
    }
    this.resolvedModelName = first;
    return this.resolvedModelName;
  }

  /**
   * Run a chat-style completion against the MLX bridge server.
   *
   * Honors the AbortSignal by passing it to `fetch`.  If the server returns
   * a non-2xx status, throws with the status + body for debuggability.
   */
  async chat(opts: ChatOptions, signal?: AbortSignal): Promise<ChatResult> {
    if (signal?.aborted) {
      throw new Error('MlxHttpBackend: aborted before fetch');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (opts.system !== undefined) {
      messages.push({ role: 'system', content: opts.system });
    }
    messages.push({ role: 'user', content: opts.user });

    const modelName = await this.resolveModelName();

    const body: OpenAIChatRequest = {
      model: modelName,
      messages,
      temperature: opts.temperature ?? 0,
      ...(opts.maxOutputTokens !== undefined
        ? { max_tokens: opts.maxOutputTokens }
        : {}),
      // When a JSON Schema is provided, use OpenAI Structured Outputs strict
      // mode. oMLX (verified 2026-05-07) enforces the schema constraint —
      // model output is forced to match enum values, required fields, etc.
      // This replaces llama.cpp's GBNF grammar enforcement at the server side.
      ...(opts.format !== undefined
        ? {
            response_format: {
              type: 'json_schema' as const,
              json_schema: {
                name: 'response',
                strict: true as const,
                schema: opts.format as Record<string, unknown>,
              },
            },
          }
        : {}),
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) {
        throw new Error('MlxHttpBackend: fetch aborted');
      }
      throw new Error(
        `MlxHttpBackend: network error — ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `MlxHttpBackend: server returned ${response.status} ${response.statusText}: ${text}`,
      );
    }

    let data: OpenAIChatResponse;
    try {
      data = (await response.json()) as OpenAIChatResponse;
    } catch (err) {
      throw new Error(
        `MlxHttpBackend: failed to parse JSON response — ${(err as Error).message}`,
      );
    }

    const text = data.choices?.[0]?.message?.content ?? '';
    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;

    return { text, promptTokens, completionTokens };
  }

  /**
   * Approximate token count: `ceil(chars / 3.5)`.
   *
   * The exact tokenizer is not exposed over HTTP; approximation stays
   * within ±15 % for typical prose/code.  The chunker applies a 0.85
   * safety margin on top of proxy counts so this drift is acceptable.
   */
  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Liveness check: GET /health.  Throws if the server is unreachable or
   * returns a non-2xx status.
   */
  async ping(): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
    } catch (err) {
      throw new Error(
        `MlxHttpBackend: ping failed — server at ${this.baseUrl} is unreachable (${(err as Error).message})`,
      );
    }
    if (!response.ok) {
      throw new Error(
        `MlxHttpBackend: /health returned ${response.status} ${response.statusText}`,
      );
    }
  }
}
