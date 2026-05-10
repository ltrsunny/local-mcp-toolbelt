/**
 * Tier-based model routing.
 *
 * The bridge routes each MCP tool invocation to a model tier. Tiers are
 * size/latency buckets, not capability buckets — the tool decides which
 * tier it wants based on expected workload (short classify vs long summary).
 *
 * v0.5.0: ALL tiers route through `MlxHttpBackend` to a local oMLX
 * (https://github.com/jundot/omlx) inference server. Single backend, single
 * inference engine, KV-cache persistence across requests, schema strictness
 * via OpenAI Structured Outputs (`response_format: { type: "json_schema",
 * strict: true }`). The legacy Ollama and llama.cpp backends were removed.
 *
 * Default models (mlx-community on Hugging Face):
 * - Tier B + C: `Qwen3-8B-4bit`  (~5 GB) — single weights, two numCtx
 *   (B at 8 192, C at 32 768). oMLX loads the model once; numCtx is a
 *   per-request parameter (informational), so reusing the same model name
 *   across tiers does NOT collide the way `LlamaCppBackend.modelPath`-keyed
 *   cache would. Eval (2026-05-07) showed 8B at ~20-24 tok/s clears all
 *   B/C tools within 60 s when MAX_OUTPUT_TOKENS caps are honored.
 * - Tier D:     `Qwen3-14B-4bit` (~8 GB) — hardest tasks (classify subtle,
 *   transform on dense input). 16 K context.
 *
 * All Apache-2.0. Download into `~/.omlx/models/<dirname>` via:
 *   npm run download-models
 * Start oMLX:
 *   brew services start jundot/omlx/omlx
 */

export type Tier = 'B' | 'C' | 'D';

export interface TierConfig {
  /**
   * Base URL of the oMLX (or any OpenAI-compatible) inference server.
   * Default: `"http://127.0.0.1:8000"` (oMLX's default port).
   */
  mlxUrl?: string;
  /**
   * Model name sent in the OpenAI `model` field — must match a directory name
   * under `~/.omlx/models/`. oMLX serves multiple models from one process and
   * routes requests by this name.
   *
   * Example: `"Qwen3-4B-Instruct-2507-4bit"`
   */
  mlxModelName?: string;
  /**
   * Context window size in tokens.
   *
   * Informational for `MlxHttpBackend` — the server-side model's max context
   * is fixed at load time. Used for the chunker's safety margin and tool
   * `maxInputTokens`.
   *
   * Tier B → 8192   (fast 4B model)
   * Tier C → 32768  (8B model with longer context)
   * Tier D → 16384  (14B model; ~9-10 GB at this context size)
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

/** Default oMLX endpoint (LAN unreachable, localhost only). */
const DEFAULT_MLX_URL = 'http://127.0.0.1:8000';

export const DEFAULT_CONFIG: BridgeConfig = {
  tiers: {
    B: {
      mlxUrl: DEFAULT_MLX_URL,
      // Qwen3-8B (Apache-2.0). 4-bit MLX ≈ 5 GB resident. Same weights as
      // Tier C — oMLX serves both at numCtx=8192 (here) and numCtx=32768 (C)
      // with no duplicate load. Capped per-tool budgets keep B latencies
      // <30 s (classify=200 tok @ ~24 tps = 8 s; summarize=600 tok = 25 s).
      mlxModelName: 'Qwen3-8B-4bit',
      numCtx: 8192,
    },
    C: {
      mlxUrl: DEFAULT_MLX_URL,
      // Same Qwen3-8B as Tier B — long-form summarize over ~25 000 words at
      // numCtx=32768. KV cache fills ~3-4 GB at this context size; total RAM
      // ~8-9 GB on a 16 GB Mac. Fits when Tier D (14B) is not also loaded.
      mlxModelName: 'Qwen3-8B-4bit',
      numCtx: 32768,
    },
    D: {
      mlxUrl: DEFAULT_MLX_URL,
      // Qwen3-14B (Apache-2.0). 4-bit MLX ≈ 8 GB resident. For hardest tasks
      // (transform on dense input, classify on subtle distinctions). At
      // numCtx=16384 with 14B + KV: ~9-10 GB total. Cannot run alongside C
      // (8B) on a 16 GB Mac without swapping; users typically configure
      // toolTierMap so only one of C/D is hot per session.
      mlxModelName: 'Qwen3-14B-4bit',
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
    // Tier D promotion (per docs/scope-memos/v0.5.0-tier-d-eval-2026-05-06.md):
    // - classify and transform are routable to D (verified 14B in ≤55s with
    //   MAX_OUTPUT_TOKENS caps).
    // - summarize-long and extract stay on B/C — output-token budgets exceed
    //   the 60 s wall on 14B even with caps.
    // Default keeps classify+transform on B for predictable latency; users who
    // have oMLX 14B loaded can override to D in their own config.
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
 * Display/telemetry identifier for a tier. Prefers the explicit model name
 * when set; falls back to the URL. Always returns a non-empty string so
 * footers/_meta never carry undefined.
 */
export function tierModelLabel(tcfg: TierConfig): string {
  if (tcfg.mlxModelName !== undefined && tcfg.mlxModelName.length > 0) {
    return tcfg.mlxModelName;
  }
  if (tcfg.mlxUrl !== undefined && tcfg.mlxUrl.length > 0) {
    return tcfg.mlxUrl;
  }
  return 'unconfigured';
}
