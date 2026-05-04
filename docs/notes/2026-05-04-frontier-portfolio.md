# Frontier Portfolio Session Data — 2026-05-03/04

Gathered during the extended session that shipped v0.3.0. Raw data for future calibration.

## Session calibration point

Single data point from the 2026-05-03 Opus session:

| Metric | Value |
|---|---|
| UI usage shown | 89% |
| Billable tokens (est.) | 3.56 M |
| Raw read tokens (est.) | 25.2 M |
| Assistant messages | 229 |
| Session window | 5-hour |

No automated way to read the % from disk — it lives in the Electron process. Need more
calibration points across sessions to build a reliable model.

Proposed threshold: **85% → initiate handoff / stop new work in current session**.

---

## Tool availability probe results (2026-05-03)

### Nvidia NIM (`https://integrate.api.nvidia.com/v1`)

Key stored in `~/.config/claude-dev/secrets.env` (chmod 600). Free tier: 40 RPM.

| Model | Status | Notes |
|---|---|---|
| `meta/llama-3.2-3b-instruct` | ✅ fast | Used in `nv_sum` for cheap summaries |
| `qwen/qwen3-coder-480b-a35b-instruct` | ✅ (slow) | Default `nv_pro` model; unreliable on long/complex prompts — returns empty |
| `mistralai/mistral-large-3-675b-instruct-2512` | ✅ | Override via `NV_PRO_MODEL` |
| `meta/llama-3.1-405b-instruct` | ✅ | |
| `nvidia/deepseek-v4-0324` | ❌ 504 | Endpoint down during probe |

**Key finding**: `nv_pro` with `qwen3-coder-480b` produced an empty response on long
CHANGELOG-drafting task. JSON parse error. Not reliable for in-session delegation of
complex multi-KB inputs. Fine for short single-shot reasoning.

### Gemini CLI (`gemini` binary)

Helpers in `~/.config/claude-dev/helpers.sh`. Env override: `GEM_MODEL`.

| Model | Status | Notes |
|---|---|---|
| `gemini-2.5-pro` | ✅ reliable | Current default in `gem` function |
| `gemini-3.1-pro-preview` | ❌ 429 repeatedly | "No capacity available on server" — shared preview compute, not per-user quota |
| `gemini-3.1-flash-preview` | ❌ 404 | Model ID does not exist |
| `gemini-2.5-pro-preview` | ❌ | Not a valid model ID |

**Current `gem` default**: `${GEM_MODEL:-gemini-2.5-pro}`.

### Ollama bridge (local)

All 6 tools functional. First real portfolio use this session: `diff-semantic-index` via
`source_uri` for v0.3.0 release commit message analysis — saved ~264 frontier tokens.
Prior session usage < 5%.

### QClaw (port 28790)

Tencent agent, configured bridge as MCP server via `openclaw.json`. Direct API access
**not possible**: `QCLAW_LLM_API_KEY` is stored encrypted (cipherText) in `app-store.json`,
only the Electron process can decrypt. No CLI access to QClaw's LLM quota.

---

## Safety finding: `gem --yolo` + short prompt = autonomous file modification

**Incident**: `gem --yolo -p "Reply: ok"` caused Gemini to:
1. Modify `packages/core/bin/cli.ts` — added `rerun` subcommand
2. Create `packages/core/src/util/command-history.ts`

All reverted via `git checkout`. No damage.

**Root cause**: `--yolo` auto-approves ALL tool calls (WriteFile, Shell, ReadFile, MCP,
subagents). With a short/ambiguous prompt, Gemini infers intent and acts autonomously.
This is by design for agentic mode — the `--yolo` flag means it.

**Mitigation**:
- Always provide explicit, scoped prompts when using `gem`
- For code tasks: include explicit scope constraints ("only read, do not modify files")
- For autonomous tasks where file writes are wanted: be explicit ("write X to Y")
- Consider wrapping `gem` in a safety function that requires longer prompts (> N chars)

---

## Portfolio framework (adopted)

**Anti-pattern**: serial fallback chain (A fails → try B → try C → use Claude).
**Right pattern**: parallel fan-out → Claude synthesizes.

| Tool | Niche |
|---|---|
| Bridge (`mcp__ollama-bridge__*`) | Structured extract/classify/summarize/diff-semantic-index. Use first. |
| `gem` (Gemini 2.5 Pro, agentic) | Adversarial review, multi-file refactors, divergent web research. |
| `copilot` (GitHub-context) | Cross-repo lookups, issue/PR context. 50 premium/month. |
| `nv_sum` / `nv_pro` (Nvidia NIM) | Offload single-shot reasoning to non-Claude/non-Gemini quota. |
| Claude | Orchestrator + final synthesis + decisions. |

**Not yet demonstrated**: actual parallel fan-out with ≥2 tools running concurrently in one turn.

---

## Pending items

- [ ] Auto-switch trigger at 85%: need more calibration points (current: 1 data point)
- [ ] `gem` safety wrapper or prompt-length guard
- [ ] QClaw end-to-end bridge test (bridge configured, never exercised from QClaw)
- [ ] Demonstrate true portfolio mode (parallel `gem` + bridge + `nv_pro` in one turn)
- [ ] Accumulate 3-5 calibration points to model token usage vs UI %
