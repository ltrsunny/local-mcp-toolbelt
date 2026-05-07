/**
 * Backend factory — turns a (BridgeConfig, toolName) pair into a concrete
 * `LlmBackend` instance.
 *
 * v0.4.0: branches on which TierConfig field is set —
 *   - `modelPath`  → `LlamaCppBackend` (in-process llama.cpp; preferred)
 *   - `model`      → `OllamaBackend`   (deprecated; removed in v0.5.0)
 *
 * `LlamaCppBackend` instances are memoized per `modelPath` because model
 * load is expensive (Metal init + multi-GB mmap). The cache is process-wide
 * and lives until shutdown — a long-lived bridge process loads each tier's
 * model exactly once.
 *
 * `OllamaBackend` instances remain non-memoized: construction is cheap
 * (no resource bind), and `OllamaClient` is the shared object that holds
 * any per-process state.
 *
 * Tool handlers should call this once per invocation; the returned backend
 * is safe to use for that single call (and for the lifetime of the process,
 * for the LlamaCpp variant).
 */

import type { LlmBackend } from '../llm/backend.js';
import { OllamaBackend } from '../llm/ollama-backend.js';
import { LlamaCppBackend } from '../llm/llama-cpp-backend.js';
import { MlxHttpBackend } from '../llm/mlx-http-backend.js';
import type { OllamaClient } from '../ollama/client.js';
import { type BridgeConfig, tierForTool } from '../config/tiers.js';

/**
 * Process-wide cache of LlamaCppBackend instances, keyed by modelPath.
 * Each entry holds an open GGUF model + pre-allocated context for the
 * lifetime of the bridge process.
 */
const llamaCppCache = new Map<string, LlamaCppBackend>();

/**
 * Process-wide cache of MlxHttpBackend instances, keyed by base URL.
 * Construction is cheap (no connection held) but memoized for API parity
 * with LlamaCppBackend and to avoid constructing duplicate instances per
 * call.
 */
const mlxHttpCache = new Map<string, MlxHttpBackend>();

export function backendForTool(
  client: OllamaClient,
  config: BridgeConfig,
  toolName: string,
): LlmBackend {
  const tier = tierForTool(config, toolName);
  const tcfg = config.tiers[tier];

  // Priority 1: MLX HTTP bridge (v0.5.0+, Tier D primary).
  // Checked before modelPath so that a Tier-D config with both fields
  // explicitly set prefers the MLX path.
  if (tcfg.mlxUrl !== undefined) {
    // Cache key includes model name (if set) so different model configs at
    // the same URL get distinct backend instances with correct routing.
    const cacheKey = tcfg.mlxModelName
      ? `${tcfg.mlxUrl}::${tcfg.mlxModelName}`
      : tcfg.mlxUrl;
    let cached = mlxHttpCache.get(cacheKey);
    if (cached === undefined) {
      cached = new MlxHttpBackend({
        baseUrl: tcfg.mlxUrl,
        numCtx: tcfg.numCtx,
        modelName: tcfg.mlxModelName,
      });
      mlxHttpCache.set(cacheKey, cached);
    }
    return cached;
  }

  // Priority 2: in-process llama.cpp (preferred for Tier B/C; fallback for D).
  // If both are present (migration window), modelPath wins over model.
  if (tcfg.modelPath !== undefined) {
    let cached = llamaCppCache.get(tcfg.modelPath);
    if (cached === undefined) {
      cached = new LlamaCppBackend({
        modelPath: tcfg.modelPath,
        contextSize: tcfg.numCtx ?? 8192,
      });
      llamaCppCache.set(tcfg.modelPath, cached);
    }
    return cached;
  }

  // Priority 3: Ollama (deprecated since v0.4.0, removed in v0.6.0).
  if (tcfg.model !== undefined) {
    return new OllamaBackend(client, {
      modelTag: tcfg.model,
      keepAlive: tcfg.keepAlive,
      // `think` not currently surfaced in TierConfig.
    });
  }

  throw new Error(
    `Tier ${tier} has neither mlxUrl, modelPath, nor model configured (toolName: ${toolName})`,
  );
}

/**
 * Test-only: clear the LlamaCpp cache so a unit test can re-seed it.
 * Production code never calls this.
 */
export function _resetLlamaCppCacheForTests(): void {
  for (const inst of llamaCppCache.values()) {
    void inst.dispose();
  }
  llamaCppCache.clear();
}

/**
 * Test-only: clear the MlxHttp cache so a unit test can re-seed it.
 * Production code never calls this.
 */
export function _resetMlxHttpCacheForTests(): void {
  mlxHttpCache.clear();
}
