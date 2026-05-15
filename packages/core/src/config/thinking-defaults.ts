import { z } from 'zod';

/**
 * Per-tool thinking-mode defaults + resolver.
 *
 * Implements scope memo v0.6.0 §4. Each MCP tool has a baseline opinion
 * about whether the underlying model should produce a reasoning trace
 * (`<think>...</think>` for Qwen3 thinking models, etc.), based on
 * Phase 1 + thinking-mode subset eval data:
 *
 *   classify / extract / transform / diff-semantic-index → ON
 *     reasoning helps structured / decision-bound tasks
 *     (transform showed +1.0 score lift in the thinking-mode subset)
 *
 *   summarize / summarize-long / summarize-long-chunked → OFF
 *     prose tasks lose ~0.5 score with thinking on (over-generation,
 *     style drift, formatting violations)
 *
 * Resolution order (highest priority first):
 *   1. Per-call explicit value ('on'|'off') — overrides everything
 *   2. Per-tool env var `OMCP_THINKING_<TOOL_NAME>` (uppercased + underscored)
 *   3. Global env var `OMCP_THINKING_MODE`
 *   4. Per-tool registry default (this file)
 *
 * `'auto'` and `undefined` per-call values fall through to env vars and
 * then the registry — there is no runtime "model decides" path in v0.6.0;
 * `'auto'` is intentionally a deterministic alias for the registry default.
 */

/**
 * Thinking mode as exposed on tool surface APIs.
 *
 * - `'on'`: force the model to emit a reasoning trace (no `/no_think`)
 * - `'off'`: suppress reasoning (`/no_think` appended)
 * - `'auto'`: defer to env-var + registry resolution (= the v0.6.0 default)
 */
export type ThinkingMode = 'on' | 'off' | 'auto';

/**
 * Reusable zod schema fragment for the `thinking` input field that v0.6.0
 * adds to every existing tool's input schema (scope memo §4). All tools
 * import this rather than defining their own `z.enum(...)` to keep the
 * description and value set consistent.
 */
export const ThinkingInputSchema = z
  .enum(['on', 'off', 'auto'])
  .optional()
  .describe(
    'Override the server-side per-tool thinking-mode default for this call. ' +
      '"on" forces the model to emit a reasoning trace (slower; tends to help ' +
      'reasoning-heavy tasks like classify / extract / transform). ' +
      '"off" suppresses the trace (faster; tends to help prose tasks like summarize*). ' +
      '"auto" (or omitted) falls back to env vars OMCP_THINKING_<TOOL> / ' +
      'OMCP_THINKING_MODE and then the registry default. See ' +
      'src/config/thinking-defaults.ts for the registry.',
  );

/**
 * Per-tool baseline opinions. Tool names match the MCP tool names exactly
 * (kebab-case, not the env-var form).
 */
export const THINKING_DEFAULTS: Readonly<Record<string, 'on' | 'off'>> = {
  // Structured / decision-bound — reasoning helps
  classify: 'on',
  extract: 'on',
  transform: 'on',
  'diff-semantic-index': 'on',
  // Prose — reasoning hurts
  summarize: 'off',
  'summarize-long': 'off',
  'summarize-long-chunked': 'off',
} as const;

/**
 * Convert a kebab-case tool name to its env-var key.
 *
 * @example envKeyFor('summarize-long')        // 'OMCP_THINKING_SUMMARIZE_LONG'
 * @example envKeyFor('diff-semantic-index')   // 'OMCP_THINKING_DIFF_SEMANTIC_INDEX'
 */
export function envKeyFor(toolName: string): string {
  return `OMCP_THINKING_${toolName.toUpperCase().replace(/-/g, '_')}`;
}

/**
 * Resolve the effective thinking mode for a tool call.
 *
 * @param toolName MCP tool name (kebab-case)
 * @param perCall  Optional per-call value (typically from the tool's
 *                 input arg `thinking`). `'auto'` and `undefined` fall
 *                 through to env-var / registry resolution.
 * @returns `'on'` or `'off'` — never `'auto'` (always resolved concretely).
 *          Tools not in the registry default to `'off'` (safer for unknown
 *          tools: avoid the wall-clock cost until someone explicitly opts in).
 */
export function resolveThinking(
  toolName: string,
  perCall?: ThinkingMode,
): 'on' | 'off' {
  // 1. Per-call explicit value wins
  if (perCall === 'on' || perCall === 'off') return perCall;

  // 2. Per-tool env var
  const perToolEnv = process.env[envKeyFor(toolName)];
  if (perToolEnv === 'on' || perToolEnv === 'off') return perToolEnv;

  // 3. Global env var
  const globalEnv = process.env['OMCP_THINKING_MODE'];
  if (globalEnv === 'on' || globalEnv === 'off') return globalEnv;

  // 4. Registry default — fall back to 'off' for unknown tools
  return THINKING_DEFAULTS[toolName] ?? 'off';
}
