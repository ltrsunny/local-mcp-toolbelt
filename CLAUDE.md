# CLAUDE.md — project conventions for Claude Code sessions

This file is auto-injected into every Claude Code session opened in this repo.
Highest priority context. Keep under 200 lines.

## What this project is

`local-mcp-toolbelt` — Apache-2.0 Node 22+ MCP server. Lets any MCP client (Claude
Desktop, Cursor, Cline, OpenClaw, Zed, …) delegate lightweight tasks to a local
oMLX inference server to save frontier tokens, stay private, and run offline.

Monorepo: `packages/core/` is the publishable package. Shipped at v0.2.0;
v0.5.0 current (rename from ollama-mcp-bridge; Ollama and llama.cpp backends
removed in this release in favor of a single oMLX/MlxHttpBackend path).

## Tools currently exposed (6)

| Tool | Tier | Notes |
|---|---|---|
| `summarize` | B | Up to ~2 K words |
| `summarize-long` | C (numCtx=32 K) | Up to ~25 K words single-call |
| `summarize-long-chunked` | C | Map-reduce; full chunking only reachable from clients with > 60 s timeout |
| `classify` | B | Strict-schema enum labels via oMLX json_schema |
| `extract` | B | Strict-schema JSON via oMLX json_schema |
| `transform` | B | Free-form rewrite |

All six tools accept `source_uri` (file:// or http(s)://) — preferred over
inline `text` because raw bytes never enter the frontier context.

## Tier system (v0.5.0: all oMLX)

| Tier | Model | numCtx | Status |
|---|---|---|---|
| B | Qwen3-4B-Instruct-2507-4bit | 8192 | ✅ default — short tasks |
| C | Qwen3-8B-4bit | 32768 | ✅ long-form summarize |
| D | Qwen3-14B-4bit | 16384 | ⚙️ Opt-in for classify + transform; toolTierMap override required |

Single backend = `MlxHttpBackend` against `http://127.0.0.1:8000` (oMLX).
Start oMLX:        `brew services start jundot/omlx/omlx`
Download weights:  `npm run download-models` (uses oMLX's bundled Python).

oMLX json_schema strict mode (verified 2026-05-07) replaces llama.cpp's GBNF —
enum + required enforced at decode. Eval (2026-05-11, hot_cache=10GB): 14B
**warm 1.1s @ ~30 tok/s** (was 12-16 cold). Routable for classify (~8s),
short summarize (~20s), short transform (~45s). `summarize-long` + `extract`
stay on B/C — long prefill+decode hit 60s wall. **MLX RSS is misleading**
(unified-mem mapped, use wall-time). See
`docs/notes/v0.6.0-60s-wall-brainstorm-2026-05-11.md`.

## Per-tool output caps (v0.5.0)

`MAX_OUTPUT_TOKENS` in `src/mcp/server.ts` (mirrored in
`tests/eval/lib/invoke.mjs`) — semantic ceilings, not tier-driven:

| Tool | Cap | Note |
|---|---|---|
| `summarize` | 600 | 1-2 paragraphs |
| `summarize-long` | 1200 | structured summary, ≤6 bullets |
| `classify` | 200 | labels + brief reason |
| `transform` | 1200 | instruction-driven |
| `extract` | 2048 | schema-driven (kept) |
| `diff-semantic-index` | 1024 | structured fields (kept) |

## Hard constraints (non-negotiable)

- **Claude Code MCP request timeout is a hardcoded ~60 s wall-clock.** Cannot be
  raised via `settings.json` or any documented env var. Per-call must stay
  under this wall. v0.3.0's async-job pattern is the structural fix.
- **16 GB Mac is the dev hardware**. oMLX serializes on Metal (calls queue).
  8B+14B ≈ 13 GB resident — tight; one tier hot per session.
  `hot_cache_max_size=6GB` in `~/.omlx/settings.json`. oMLX on HEAD post-
  2026-05-11 (+ #1126/#1146/#1101 fixes); MlxHttpBackend has a circuit-
  breaker for mid-request abort. See `docs/notes/v0.5.x-omlx-stability-2026-05-11.md`.
- **Apache-2.0 license**. New deps must be permissive (Apache / MIT / BSD / ISC).
  Workspace-root `overrides.uuid` ^14 keeps `npm audit` clean.
- **Node 22+, TypeScript strict, vitest, raw `tsc` build (no bundler)**. Unpacked
  `dist/` size ≈ runtime cost; tree-shaking does not apply.

## Architecture

- `LlmBackend` interface (`src/llm/backend.ts`) — neutral contract: `chat`,
  `countTokens`, `ping`. AbortSignal threads through `chat`.
- `MlxHttpBackend` (`src/llm/mlx-http-backend.ts`) — the only implementation
  in v0.5.0. Speaks OpenAI-compatible HTTP to oMLX; uses `response_format:
  {type: "json_schema", strict: true}` for grammar enforcement.
- `backendForTool(config, toolName)` resolves tier → memoized MlxHttpBackend
  instance keyed by `(mlxUrl, mlxModelName)`.
- All tools call `backendForTool(...).chat()`. `migration-snapshot.test.ts`
  captures the deterministic ChatOptions payload per tool as the contract.
- Chunking: `src/chunking/{prompts,split,map-reduce}.ts` + `p-limit` for
  bounded fan-out. Each per-call timeout is `AbortSignal.any([jobSignal,
  AbortSignal.timeout(50_000)])`.

## Testing layout

- `npm test` (in `packages/core/`) → 147 unit tests via vitest. Pure in-process,
  no oMLX required (all backend calls go through a `RecorderBackend` test
  double via `_installTestBackend`). Runs in CI.
- `node tests/probe-numctx.mjs` and `tests/diag-long-input.mjs` are diagnostic
  scripts for failure-mode investigation against a real oMLX server.

## Process expectations (feature-intake-rule)

Any new feature MUST go through:
1. **Prior Art Review** (≥3 candidates) — see `docs/prior-art/`
2. **Scope memo** with Auditor pass — see `docs/scope-memos/`
3. THEN code

The Auditor is the user. No code lands ahead of an approved scope memo.

## Bridge-usage discipline (for Claude Code itself)

The whole point of this project is for Claude Code to USE the bridge to save
its own tokens. Real practice during v0.2.0 cycle: < 5 % usage. Doing better
now:

- **Any > 1 KB external research output (Gemini / Copilot return, paper PDF,
  podcast transcript)**: feed via `source_uri` if URL exists, else save to
  `/tmp/...` and use `file://`. Inline `text` only for content already in
  context.
- **Multi-AI critique cycles**: pipe outputs between Gemini and Copilot via
  bash, NOT through frontier. Frontier reads only the final consolidated view.
- **Long file reads before precise edit**: still required (no shortcut).
- **Long file reads NOT before precise edit** (just understanding): use
  `summarize-long-chunked` with `source_uri` to compress.

## Token-saving tactics that worked in v0.2.0

- `tsc | head -n 50` instead of full compiler error dumps
- `grep` + targeted `Read` with `offset/limit` instead of full-file `Read`
- Bash `cat A | gemini -p ...` to keep large file content out of frontier
- Background tasks (`run_in_background`) so frontier doesn't wait synchronously

## Things to push back on (challenge user / self)

- More than 2-3 audit rounds on the same scope memo → diminishing returns
- "Boilerplate" commit messages > 30 lines → over-stating the work
- Reading external research output in full before knowing what we're looking
  for → use `extract` with a specific query first
- Doing yet another scope memo when real usage data would resolve the question
  → ship and observe instead

## Outside-help cheat sheet

- **Gemini CLI** (`gem "..."` shell function): full ReAct agentic loop —
  WriteFile, Shell, ReadFile, MCP servers, subagents, hooks. `--yolo`
  auto-approves all actions; `-p` is headless/scriptable. Default model:
  `gemini-3.1-pro-preview` (best available); auto-falls back to
  `gemini-2.5-pro` → `gemini-2.5-flash` on capacity errors. Override:
  `GEM_MODEL=gemini-2.5-flash gem "..."`. Best for: divergent web research,
  adversarial scope-memo reviews, multi-source PA surveys, delegated
  multi-file tasks. Pro subscription, generous quota.
- **Copilot CLI** (`copilot -p ... --effort xhigh --yolo`): standalone
  `@github/copilot` npm binary, full agentic. **`--yolo` is required in
  `-p` mode** — it covers all-tools + all-paths + all-urls. Plain
  `--allow-all-tools` leaves path/URL prompts headless can't answer →
  silent hang (verified 2026-05-11, copilot 1.0.44). `--effort xhigh` =
  max reasoning. Best for: multi-file refactors, GitHub-MCP context
  (issues, PRs). 50 premium/month.
- **Nvidia NIM** (`nv_sum`, `nv_pro` shell functions): free OpenAI-compatible
  inference. `nv_sum` → llama-3.2-3b for fast small tasks; `nv_pro` →
  qwen3.5-397b-a17b for heavy single-shot analysis (verified live
  2026-05-10; deepseek-v4-pro is currently capacity-exhausted, kimi-k2.6
  has tokenizer corruption). No agentic loop — pipe-in / Q&A only. Use
  when a task needs frontier-class inference but not multi-step tool use.
  **Always check `/v1/models` for current availability** before assuming
  a specific model works — config drifts.
- **The bridge itself** for everything that fits — see "Bridge-usage
  discipline" above.

### Tool orchestration: portfolio, not fallback

These tools are configured to run **concurrently and in combination**, not as
a try-A-then-B chain. Each has a niche; non-trivial tasks fan out to ≥2 of
them in parallel and Claude synthesizes.

| Tool | Niche |
|---|---|
| Bridge (`mcp__local-mcp__*`) | Structured `extract` / `classify` / `summarize` / `diff-semantic-index`. Small bounded calls. **Use first** — saves frontier without leaving local. |
| `gem` (Gemini 2.5 Pro, agentic) | Adversarial review, multi-file refactors, divergent web research. |
| `copilot` (GitHub-context) | Cross-repo lookups, issue / PR context, GitHub-MCP tasks. 50 premium / month. |
| `nv_sum` / `nv_pro` (Nvidia NIM) | Offload single-shot reasoning to a non-Claude / non-Gemini quota. |
| Me (Claude) | Orchestrator + final synthesis + decisions. |

**Anti-pattern**: serial fallback ("`gem` failed, switch to `nv_pro`, switch to bridge"). That's the failure mode of v0.3.0 release in this session.
**Right pattern**: parallel fan-out → synthesize. Example for a release commit: `diff-semantic-index` + `gem "review the diff for risk"` + Claude composing the message — concurrent, ~one wall-clock step.

Quota emergency (Claude session > 85%): handoff via `/handoff-to-gemini` is the
**fallback** path — but the portfolio above is the **default**.

## Files to know

- `docs/scope-memos/` — feature scope memos (Auditor-passed before
  implementation)
- `docs/prior-art/` — Prior Art Review outputs
- `docs/notes/` — research notes (no Auditor required, lighter-weight)
- `docs/process/commit-discipline.md` — **product** (`feat/fix/release/chore`)
  vs **dev-meta** (`meta(*):`) commits, never mixed (since 2026-05-12).
- `CHANGELOG.md` — Keep a Changelog format, SemVer. Version-sync enforced via
  `prepublishOnly`.
