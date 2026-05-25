# Brief: extending iron rule to copilot-free — dynamic Gemini model selection

> **🚫 DISPROVED 2026-05-22 (post-fan-out empirical retest)**: This
> brief led 5 voices to converge on "switch default to gemini-2.5-flash"
> based on the claim that Gemini 3.x family has known ReAct breakage
> via OAI-compat shim (citing LiteLLM #21041 without empirical
> verification). Empirical retest later same day (4-run thinkingConfig
> probe + tool_calls test on shim + Google's own docs `ai.google.dev/
> gemini-api/docs/openai` using `gemini-3.5-flash` as the canonical
> example) showed the cited bug does NOT apply to single tool_calls
> via OAI shim. KEPT in repo as empirical evidence of woozle effect
> (brief framing → 5-voice convergence on wrong answer). See
> auditor-protocol.md anti-patterns #21 (Citation ≠ Evidence) and
> #22 (Brief framing pre-shapes voice convergence) added 2026-05-22.

You are 1 of N voices designing how to make `copilot-free` follow today's
iron rule (dynamic model discovery + ping, no sticky default). Real
research preferred; cite Gemini API docs / AI Studio OAI-compat docs.

## Context

helpers.sh `copilot-free` today:
```bash
copilot-free() {
  local model="${COPILOT_FREE_MODEL:-gemini-3.5-flash}"  # hardcoded default
  COPILOT_OFFLINE=true \
  COPILOT_PROVIDER_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai \
  COPILOT_PROVIDER_TYPE=openai \
  COPILOT_PROVIDER_BEARER_TOKEN="$GEMINI_API_KEY" \
  COPILOT_MODEL="$model" \
  copilot --yolo "$@"
}
```

Routes through Copilot CLI's BYOK env vars → AI Studio OAI-compat shim
(`/v1beta/openai/chat/completions`).

## Constraints (verified 2026-05-22)

1. **Copilot CLI takes ONE model per invocation** via COPILOT_MODEL env;
   no "list of fallbacks" API
2. **Must support tool-calling** — Copilot uses ReAct agentic loop with
   ~17K-token sysprompt teaching grep/edit/bash usage
3. **Shim total-input cap ~17.2K tokens** (empirically: 17.2K up = 200ms
   OK; 17.4K up = 400 transient_bad_request). Different from native
   Gemini endpoint (1M+ tokens). User-prompt budget ≈ shim_cap - sysprompt
   ≈ ~200 chars
4. **AI Studio free tier quota**: 50/day high-tier + 150/day low-tier
   (similar to GHM); may differ per Gemini family member

## Today's iron rule (NIM + GHM precedent)

- Fresh-smoke `/models` endpoint on EVERY call
- Filter candidates by tier + required capabilities
- Random shuffle within tier; 5-tok ping for liveness
- First healthy = winner
- NO env override of model id

## Design questions

### Q1 — Discovery: Gemini available-models endpoint
Does `https://generativelanguage.googleapis.com/v1beta/models` (or
v1/models) return a usable list with capability metadata (e.g. tool-
calling support flag, context window)? Cite the actual docs URL.

### Q2 — Tool-calling support filter
Gemini-3.5-flash, 2.5-flash, 2.5-flash-lite, 2.5-pro all support
function-calling per Gemini docs. But via the OAI-compat shim
(`/v1beta/openai`) does this translate to OpenAI-style `tool_calls`
response field that Copilot CLI parses? Empirical test needed?

### Q3 — Ping strategy
NIM/GHM pickers ping with `messages:[{role:"user",content:"say hi"}],
max_tokens:5` — works because no sysprompt overhead. For copilot-free,
ping CAN'T include Copilot's 17K sysprompt (that's only added when
Copilot CLI invokes). Options:
- (a) Ping the shim directly (no sysprompt) → tests model availability
  but doesn't verify Copilot ReAct compatibility
- (b) Skip ping; just discover + try; surface 400 if cap exceeded
- (c) Mock Copilot's tool-call structure in ping (mini ReAct probe)

### Q4 — Selection within candidate pool
Pool is small (~3-5 Gemini flash variants). Selection policy:
- (a) Random shuffle (like NIM/GHM picker)
- (b) Prefer fastest (3.5-flash is fastest; 2.5-pro highest quality)
- (c) Prefer latest version number
- (d) Family-bias agnostic (already all Gemini — no anti-bias needed)

### Q5 — Failure handling
When Copilot returns 400 transient_bad_request (shim cap exceeded):
- (a) Retry with different model from candidate pool
- (b) Fail loud — picker can't fix prompt-size issue
- (c) Estimate user-prompt size pre-call; reject early if obvious

### Q6 — 4th option not in current frame
Is dynamic selection actually the RIGHT answer here? Or:
- Pool is so small (3-5) that random shuffle gives minimal entropy
- "Latest 3.5-flash" stays stable across catalog drift
- Maybe document the constraint and accept hardcoded default with
  COPILOT_FREE_MODEL env override as the legitimate escape valve

What's the case for NOT extending iron rule here?

## Output shape (≤700 words)

For each Q (1-6):
- **Finding/Recommendation**: specific design
- **Source evidence**: cited URL or empirical test
- **Confidence**: solid/weak/NOT FOUND

End with:
- **Concrete patch design** (helpers.sh diff sketch)
- **Top 2 risks** of your design
- **Self-bias note**

Hard constraint: real evidence only. NOT FOUND if unverifiable.
