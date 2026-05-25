# Tool 5-axis audit — 2026-05-18

> **🔄 PARTIAL RE-AUDIT 2026-05-22**: Findings in §"Verified bypass
> paths" table (lines 60-69) and §"Net actionable findings" row 3
> (line 157) are **STALE**. Empirical retests on 2026-05-22 found:
> - **NIM** "tool-call parser not enabled" → FALSE. 4/5 tested NIM
>   models (meta/llama-3.3-70b, mistralai/mistral-large-3-675b, etc.)
>   return tool_calls via OAI shim. Issue was vLLM config gap at the
>   time of audit — server side now correctly configured.
> - **GitHub Models** "8K input cap" → FALSE. Catalog 2026-05-22:
>   39/43 models have ≥128K context (gpt-4o-mini, gpt-4.1, llama-3.3-
>   70b etc. all 128K+). Old 8K cap was either pre-Dec-2025 quota
>   policy or specific to certain models (deepseek-r1 still has 4K).
> See `.claude/brainstorm/cross-provider-byok-picker-brief-2026-05-22.md`
> for the empirical evidence and proposed cross-provider picker design.
> Full Copilot BYOK end-to-end test against NIM/GHM still pending as
> of 2026-05-22.

Trigger: PM challenge "你每次的 bundle 都没有直接获取而是靠猜测".
Coverage: gemini-cli, copilot, ghm (GitHub Models), nv_pro (NIM
gateway), bridge MCP. Each inspected on 5 axes per
auditor-protocol anti-pattern #16.

## 1. gemini-cli (`gemini`, v0.42.0)

Auditor-protocol #16 audit done in-thread earlier. Key facts:

| Axis | Finding |
|---|---|
| Binary | node script `/opt/homebrew/bin/gemini` |
| Env vars | DEBUG, DEBUG_AUTH, GEMINI_API_KEY (USE_GEMINI auth path) |
| Config | `~/.gemini/settings.json`, `oauth_creds.json`, `trustedFolders.json` |
| Endpoints | `cloudcode-pa.googleapis.com` (OAuth), `generativelanguage.googleapis.com` (API key), `aiplatform.googleapis.com` (Vertex) |
| Auto-load | **`GEMINI.md` + `AGENTS.md` + `README.md` from cwd** |
| Trust | Workspace trust required for yolo mode; `--skip-trust` bypass |
| **Side effect** | **yolo allows agentic exploration via list_directory / read_file → reads project context** |

**helpers.sh remediation (applied 2026-05-18):** `gem-pro` and
`gem-pro-escalate` now `cd $(mktemp -d)` + `--skip-trust` before
invoke. Verified clean: gem-pro called from project root now
returns "I do not have specific information on local-mcp-toolbelt"
(generic training-data answer) vs pre-fix referencing CLAUDE.md
phrases.

## 2. copilot CLI (Mach-O native, v1.0.49)

Brew formula: `gh-copilot`-like binary, NOT a JS package.

| Axis | Finding |
|---|---|
| Binary | `/opt/homebrew/bin/copilot` — Mach-O 64-bit arm64 |
| Subcommands | login / mcp / plugin / init / update / completion / help |
| Env vars | **Extensive BYOK system** (see below) |
| Config | `$COPILOT_HOME` or `$HOME/.copilot` |
| Quota | All `--effort` levels (none/low/medium/high/xhigh) share Premium request quota; Student Pack = Copilot Pro = 300 premium/month |

### BIG DISCOVERY — BYOK environment

```bash
COPILOT_PROVIDER_BASE_URL    # custom OpenAI-compat endpoint
COPILOT_PROVIDER_TYPE        # openai / azure / anthropic
COPILOT_PROVIDER_BEARER_TOKEN
COPILOT_PROVIDER_API_KEY
COPILOT_PROVIDER_WIRE_API    # completions (default) / responses (for GPT-5)
COPILOT_PROVIDER_MODEL_ID
COPILOT_PROVIDER_WIRE_MODEL
COPILOT_OFFLINE=true         # skip GitHub auth + telemetry
COPILOT_CUSTOM_INSTRUCTIONS_DIRS  # similar to gemini's GEMINI.md
COPILOT_ALLOW_ALL=true       # env-level YOLO
```

**Implication:** Copilot's full agentic ReAct loop (file/shell
tools, MCP servers, --yolo) can target **any OpenAI-compatible
endpoint** — local oMLX, GitHub Models, Vertex, etc. — bypassing
GitHub Copilot's monthly Premium quota.

**Verified bypass paths (2026-05-18, updated):**

| Endpoint | Result | Reason |
|---|---|---|
| **Google AI Studio** `/v1beta/openai/` | **✅ WORKS** | Full OpenAI-compat including tool-calling. 3s wall-clock, 17K input (Copilot agentic system prompt), 5 output. 0 Copilot Premium quota burn. |
| GitHub Models `/inference/` | ❌ BLOCKED | Platform 8K input cap < 17K Copilot system prompt |
| NIM `/v1` | ❌ BLOCKED | NIM server-side: `tool_choice="auto" requires --enable-auto-tool-choice and --tool-call-parser to be set` — vLLM config gap |
| Local oMLX `/v1` | ❌ same as NIM | Qwen3 OpenAI endpoint lacks tool-call parser |
| Anthropic API | ❌ no key | Requires paid Anthropic API |

**The Google AI Studio path is the critical win.** It provides:
- Full Copilot agentic ReAct loop (file/shell/MCP tools)
- gemini-3.5-flash (or any AI Studio free-tier model) as backend
- **0 Copilot Premium quota burn** (uses Google API key instead)
- **Survives 2026-06-18 OAuth cutoff** (API key path persists)
- 3s typical wall-clock (vs OAuth `gem-pro` ~5-30s)

Recommended invocation:
```bash
COPILOT_OFFLINE=true \
COPILOT_PROVIDER_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai \
COPILOT_PROVIDER_TYPE=openai \
COPILOT_PROVIDER_BEARER_TOKEN=$GEMINI_API_KEY \
COPILOT_MODEL=gemini-3.5-flash \
copilot -p "..." --yolo
```

This filling the "agentic + free + post-6/18" gap previously
unmet by any portfolio voice. Consider wrapping as `copilot-free`
shell function for ergonomics.

## 3. ghm (GitHub Models PAT, shell function in helpers.sh)

| Axis | Finding |
|---|---|
| Endpoint | `https://models.github.ai/inference/chat/completions` |
| Auth | `Authorization: Bearer <PAT>` + `Accept: application/vnd.github+json` |
| Body shape | OpenAI-compatible (`model`, `messages`, etc.) |
| **Tool-calling** | **✅ supported** — verified with get_weather sample |
| **Streaming** | **✅ supported** — SSE with content filtering events |
| Content filter | Azure-style: hate / jailbreak / self_harm / sexual |
| Input cap | **8K tokens (platform-level, all models)** |
| Free quota | 50/day high-tier (gpt-4o, deepseek-r1), 150/day low (gpt-4o-mini, llama-3.x), 50/day embeddings |
| Catalog drift | Per anti-pattern: fresh-smoke each fan-out |

## 4. nv_pro (NIM gateway, shell function in helpers.sh)

| Axis | Finding |
|---|---|
| Endpoint chat | `https://integrate.api.nvidia.com/v1/chat/completions` |
| **Endpoint embeddings** | **`https://integrate.api.nvidia.com/v1/embeddings` — VERIFIED working** with `nvidia/nv-embedqa-e5-v5` |
| Auth | `Authorization: Bearer $NVIDIA_API_KEY` |
| Tool-calling | untested (8s smoke timeout — needs longer probe) |
| Catalog drift | ~70% 404s today; fresh-smoke mandatory |

### BIG DISCOVERY — Free NIM embeddings API

NVIDIA NIM's `/v1/embeddings` endpoint serves `nvidia/nv-embedqa-
e5-v5` (and likely other embedding models in catalog). Verified
returns valid float-vector response for sample input.

**Implication for project:** The "embedding tier missing for
diff-semantic-index" axis raised in today's v0.7 strategy
brainstorm has a **free remote path via NIM** — usable
immediately without:
- adding local MLX embedding model (storage / weight download)
- using GCP Vertex Embeddings ($265 credit / 90-day burn)
- using GitHub Models embeddings (50/day cap)

Recommended bridge integration path: add `diff-semantic-index`
backend option for NIM embeddings (alongside future local MLX
option), making the embedding tier shippable in v0.7 without
local model footprint.

## 5. bridge MCP (`mcp__local-mcp-toolbelt__*`)

Self-audit (this project). Surface confirmed:

- `summarize`, `summarize-long`, `summarize-long-chunked`
- `classify`, `extract`, `transform`
- `diff-semantic-index`
- `enqueue_job`, `check_progress`, `read_job_result`,
  `wait_for_job` (v0.3 async-job triad — `wait_for_job` and
  `enqueue-job` are deprecated aliases per v0.6.0 release)

Implementation: `packages/core/src/mcp/server.ts` via
`server.registerTool()`. Tier resolution via
`backendForTool(config, toolName)` → memoized MlxHttpBackend
keyed by `(mlxUrl, mlxModelName)`.

## Net actionable findings

| # | Finding | Action |
|---|---|---|
| 1 | **NIM free embeddings via `nv-embedqa-e5-v5`** | Mitigates "embedding tier missing" axis from today's v0.7 strategy reversal. Add as bridge backend candidate for `diff-semantic-index`. Defer benchmark vs local MLX `bge-m3-mlx` to a separate session. |
| 2 | **gemini-cli yolo + cwd reads CLAUDE.md / README.md** | FIXED in helpers.sh (cd $(mktemp -d) + --skip-trust). Past fan-out output partially polluted; future clean. |
| 3 | **Copilot BYOK exists**, blocked by GitHub Models 8K cap; oMLX path untested | Document and defer; not immediately usable. |
| 4 | **GitHub Models supports tools + streaming** | Possible richer fan-out: voices that call tools mid-brainstorm for fact-check. Not pressing. |
| 5 | **Tool-calling needs probing** on each gateway | Add to per-tool audit checklist; nv_pro tool-call untested. |

## Process learning

5-axis tool audit takes ~5 minutes per tool (not 30+ feared).
The investment paid: 3 of 5 tools surfaced material new info that
changes architecture options. Should be standard for any new
tool added to portfolio.
