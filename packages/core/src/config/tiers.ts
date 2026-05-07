/**
 * Tier-based model routing.
 *
 * The bridge routes each MCP tool invocation to a model tier. Tiers are
 * size/latency buckets, not capability buckets — the tool decides which
 * tier it wants based on expected workload (short classify vs long summary).
 *
 * The default set of models comes from the audit trail in the project notes:
 * - Tier B (primary) = qwen3:4b-instruct-2507-q4_K_M
 *   Chosen because it is the only commercially-licensed (Apache 2.0),
 *   Chinese-capable, native-tool-calling, non-thinking 3-4B model on
 *   ollama.com as of 2026-04. Bare `qwen3:4b` is a separate hybrid-reasoning
 *   model whose thinking mode cannot be disabled reliably — do NOT substitute.
 * - Tier C (optional) = qwen2.5:7b
 *   Apache 2.0, Chinese explicitly listed on the Ollama library page,
 *   ~4.7 GB weights, fits 16 GB Macs comfortably for long-form summarize.
 *
 * Users who only touch English content can opt into `llama3.2:3b` as Tier B,
 * which Ollama's library page literally recommends for "Summarization,
 * Prompt rewriting, Tool use".
 */

export type Tier = 'B' | 'C' | 'D';

export interface TierConfig {
  /**
   * Ollama model tag, e.g. "qwen3:4b-instruct-2507-q4_K_M".
   *
   * @deprecated since v0.4.0 — use `modelPath` for the llama.cpp backend.
   * Ollama itself is being removed (see
   * `docs/scope-memos/v0.4.0-llama-cpp-backend-2026-05-04.md` for the ethical
   * rationale per https://sleepingrobots.com/dreams/stop-using-ollama/). The
   * field is retained for one minor version so externally-managed configs
   * don't break on upgrade. Removal in v0.5.0.
   */
  model?: string;
  /**
   * Absolute path to a GGUF file consumed by the llama.cpp backend (v0.4.0+).
   * Either `modelPath` or the deprecated `model` MUST be set; if both are
   * present, `modelPath` wins.
   */
  modelPath?: string;
  /**
   * Ollama `keep_alive` parameter. Number = seconds, string = duration,
   * `-1` = forever. Ignored by the llama.cpp backend (model stays loaded
   * for the bridge process lifetime).
   */
  keepAlive?: string | number;
  /**
   * Base URL of an MLX-compatible HTTP inference server (v0.5.0+).
   *
   * When set, `MlxHttpBackend` is used for this tier, calling the
   * OpenAI-compatible `/v1/chat/completions` endpoint at this URL.
   * Takes precedence over `modelPath` when both are set.
   *
   * Tested with oMLX (https://github.com/jundot/omlx), which exposes an
   * Anthropic-compatible + OpenAI-compatible API with KV-cache persistence.
   * Also works with any server exposing `/v1/chat/completions`.
   *
   * Example: `"http://127.0.0.1:8000"`
   *
   * See `docs/scope-memos/v0.5.0-tier-d-eval-2026-05-06.md` §D3.
   */
  mlxUrl?: string;
  /**
   * Model name sent in the OpenAI `model` field (v0.5.0+).
   *
   * Required for multi-model servers (oMLX routes by name). When omitted,
   * `MlxHttpBackend` auto-detects the first model from `GET /v1/models`.
   * Set explicitly to avoid the extra round-trip or to pin a specific model.
   *
   * Example: `"Qwen3-8B-4bit"` (must match the directory name under
   * `~/.omlx/models/` for oMLX).
   */
  mlxModelName?: string;

  /**
   * Context window size in tokens.
   *
   * Ollama: maps to `num_ctx`; runtime default is 4096 regardless of the
   * model's maximum. Without this field the model silently left-truncates
   * inputs that exceed 4096 tokens. Set explicitly per tier to prevent
   * data loss.
   *
   * llama.cpp: fixed at context-creation time (KV cache pre-allocated for
   * the declared size), so this is the *ceiling* the tier pre-reserves.
   *
   * MLX HTTP bridge: informational only — the server-side model's context
   * is fixed at load time; this value is surfaced in token-budget telemetry.
   *
   * Tier B → 8192 (fast 4B model; fits comfortably on 16 GB Mac)
   * Tier C → 32768 (7B model with ~2 GB KV cache at this size)
   * Tier D → 16384 (14B model; Qwen3-14B-MLX-4bit default context)
   */
  numCtx?: number;
}

export interface BridgeConfig {
  tiers: Record<Tier, TierConfig>;
  /** Fallback tier when a tool has no explicit mapping. */
  defaultTier: Tier;
  /** Per-tool tier assignment. Absent keys fall back to defaultTier. */
  toolTierMap?: Record<string, Tier>;
}

export const DEFAULT_CONFIG: BridgeConfig = {
  tiers: {
    B: {
      model: 'qwen3:4b-instruct-2507-q4_K_M',
      // 10 minutes idle: on a 16 GB Mac, -1 (forever) pins ~3.5 GB VRAM even
      // when the bridge is quiet. 10 min trades one cold start per idle hour
      // for headroom; tighten via OMCP_TIER_B_KEEPALIVE if the host is roomy.
      keepAlive: '10m',
      // 8192 tokens: doubles the default 4096 without stressing VRAM on 16 GB
      // Macs (~0.5 GB additional KV-cache for qwen3:4b at Q4_K_M).
      numCtx: 8192,
    },
    C: {
      // 5 minutes idle — Tier C is explicitly on-demand; no reason to hold
      // the larger weights when the long-summarize tool isn't being called.
      model: 'qwen2.5:7b',
      keepAlive: 300,
      // 32768 tokens: supports ~25 000-word documents. On a 16 GB Mac the
      // qwen2.5:7b Q4_K_M model uses ~4.7 GB weights + ~2 GB KV-cache at
      // this context size — total ~6.7 GB, measured via diag-long-input.mjs
      // on 2026-04-24 (no OOM, 223 s wall time for a 32 K-token input +
      // 100-token output). Callers with MCP request timeouts below ~300 s
      // will need to raise them; longer documents still truncate silently
      // (pending map-reduce summarization as a separate feature).
      numCtx: 32768,
    },
    // Tier D — 8B–14B MLX via oMLX (https://github.com/jundot/omlx).
    // Promoted to active tier when eval confirms quality ≥4.0 / 95p <55 s.
    // See docs/scope-memos/v0.5.0-tier-d-eval-2026-05-06.md.
    //
    // NO mlxUrl set here: Tier D is intentionally unconfigured by default.
    // Users who have oMLX running enable it by adding to their config:
    //   { tiers: { D: { mlxUrl: "http://127.0.0.1:8000",
    //                   mlxModelName: "Qwen3-8B-4bit" } } }
    // A Tier-D tool call on an unconfigured bridge throws at runtime with
    // a clear message.  Start oMLX with:
    //   brew services start jundot/omlx/omlx
    D: {
      // 16384 tokens: balances quality (enough context for long tasks) vs
      // KV-cache headroom on a 16 GB Mac.  Qwen3-8B-MLX-4bit at this
      // context uses ~6-7 GB total; Qwen3-14B at 16K uses ~9-10 GB.
      numCtx: 16384,
    },
  },
  defaultTier: 'B',
  toolTierMap: {
    summarize: 'B',
    'summarize-long': 'C',
    // Same Tier C as summarize-long — chunked variant uses the same model,
    // just adds map-reduce orchestration on top.
    'summarize-long-chunked': 'C',
    // Tier D tools are not assigned here by default — promoted post-eval.
    // Uncomment and set toolTierMap overrides in user config after eval passes.
  },
};

export interface ResolveOptions {
  /** Override the model for a specific tier (e.g. via CLI flag). */
  tierOverrides?: Partial<Record<Tier, Partial<TierConfig>>>;
}

/**
 * Apply overrides on top of a base config. Leaves unspecified fields alone.
 */
export function withOverrides(
  base: BridgeConfig,
  opts: ResolveOptions = {},
): BridgeConfig {
  if (!opts.tierOverrides) return base;

  const tiers = { ...base.tiers };
  for (const key of Object.keys(opts.tierOverrides) as Tier[]) {
    const override = opts.tierOverrides[key];
    if (!override) continue;
    tiers[key] = { ...tiers[key], ...override };
  }
  return { ...base, tiers };
}

export function tierForTool(config: BridgeConfig, toolName: string): Tier {
  return config.toolTierMap?.[toolName] ?? config.defaultTier;
}

export function modelForTool(config: BridgeConfig, toolName: string): TierConfig {
  return config.tiers[tierForTool(config, toolName)];
}

/**
 * Display/telemetry identifier for a tier. Prefers the GGUF filename when
 * `modelPath` is set; otherwise falls back to the deprecated Ollama tag.
 * Always returns a non-empty string so footers/_meta never carry undefined.
 */
export function tierModelLabel(tcfg: TierConfig): string {
  if (tcfg.mlxUrl !== undefined) {
    // MLX HTTP path: prefer explicit model name, fall back to URL.
    return tcfg.mlxModelName ?? tcfg.mlxUrl;
  }
  if (tcfg.modelPath !== undefined && tcfg.modelPath.length > 0) {
    return tcfg.modelPath.split('/').pop() ?? tcfg.modelPath;
  }
  return tcfg.model ?? 'unconfigured';
}
