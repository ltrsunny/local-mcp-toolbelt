/**
 * RecorderBackend — test double for `LlmBackend` that captures every
 * `chat()` invocation's args verbatim and returns a fixed ChatResult.
 *
 * v0.5.0: replaces the previous OllamaClient-subclass RecorderClient. The
 * single-backend architecture (MlxHttpBackend everywhere) means tests
 * inject a recorder into `mlxHttpCache` via `_resetMlxHttpCacheForTests`
 * + `_seedMlxHttpCacheForTests`. The bridge resolves tiers normally;
 * `backendForTool()` returns the cached recorder for whatever
 * (mlxUrl, mlxModelName) any tier asks for.
 *
 * Used by migration-snapshot.test.ts to verify each tool handler still
 * sends the expected ChatOptions to the backend after the v0.5.0 collapse
 * to a single inference path.
 *
 * Not part of the runtime — tests/unit/* is excluded from the published
 * dist via tsconfig include rules.
 */

import type {
  LlmBackend,
  ChatOptions,
  ChatResult,
} from '../../src/llm/backend.js';

export interface RecordedCall {
  /** The full ChatOptions passed to chat() for this call. */
  args: ChatOptions;
  /** Wall-clock order; useful when a single test triggers multiple chat calls. */
  index: number;
}

/**
 * Fixed ChatResult returned for every recorded call. Token counts are
 * arbitrary but non-zero so any caller that propagates them to telemetry
 * doesn't blow up on division-by-zero.
 */
export const FAKE_CHAT_RESULT: ChatResult = {
  text: '<<recorder fake response>>',
  promptTokens: 100,
  completionTokens: 20,
};

export class RecorderBackend implements LlmBackend {
  readonly recorded: RecordedCall[] = [];
  readonly modelId = 'recorder-fake';

  async chat(opts: ChatOptions, signal?: AbortSignal): Promise<ChatResult> {
    void signal; // recorder doesn't honor abort
    // Deep-clone via JSON round-trip so subsequent mutations by the caller
    // (if any) don't retroactively change the recording. ChatOptions
    // fields are flat primitives + the `format` schema object.
    const cloned = JSON.parse(JSON.stringify(opts)) as ChatOptions;
    this.recorded.push({ args: cloned, index: this.recorded.length });
    return FAKE_CHAT_RESULT;
  }

  async countTokens(text: string): Promise<number> {
    // Approximate — chunker only uses this for budget math, not assertions.
    return Math.ceil(text.length / 3.5);
  }

  async ping(): Promise<void> {
    /* always healthy */
  }

  reset(): void {
    this.recorded.length = 0;
  }
}

// ── Backwards-compat alias ───────────────────────────────────────────────────
// migration-snapshot.test.ts and the job-test files still import
// `RecorderClient`. Keep a thin alias so the rename to RecorderBackend
// doesn't ripple through every test file. New tests should prefer
// `RecorderBackend` directly.
export { RecorderBackend as RecorderClient };
