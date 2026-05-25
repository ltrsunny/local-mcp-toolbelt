# Brief: cross-provider BYOK picker for `copilot` — design proposal

You are 1 of N voices designing a dynamic BYOK provider+model selection
mechanism for Copilot CLI. Real research preferred; cite endpoints,
program help, and prior art with verified URLs.

## Context

helpers.sh `copilot-free` today hardcodes BOTH:
```bash
COPILOT_PROVIDER_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
COPILOT_MODEL=gemini-3.5-flash
```

This violates iron rule at TWO levels: provider routing + model id.
Today's session (2026-05-22) confirmed BOTH the underlying 2026-05-18
blocker findings are stale:

| Provider | OAI-compat endpoint | 2026-05-18 audit said | 2026-05-22 reality |
|---|---|---|---|
| AI Studio | `/v1beta/openai` | "works, 17K shim cap" | Same |
| NVIDIA NIM | `integrate.api.nvidia.com/v1` | "blocked: server-side tool-call parser not enabled" | **4/5 tested NIM models support tool_calls** (verified earlier today) |
| GitHub Models | `models.github.ai/inference` | "blocked: 8K cap < Copilot 17K sysprompt" | **39/43 catalog models ≥ 128K context** (verified earlier today) |
| Local oMLX (Qwen3) | `127.0.0.1:8000/v1` | "blocked: Qwen3 lacks tool-calls" | Untested today; likely still true |

**The audit document needs revalidation.**

## Copilot CLI BYOK mechanism (from `copilot help providers`)

Key env vars:
```
COPILOT_PROVIDER_BASE_URL      # API endpoint URL (REQUIRED to activate BYOK)
COPILOT_PROVIDER_TYPE          # "openai"|"azure"|"anthropic" (default openai)
COPILOT_PROVIDER_API_KEY       # API key (or BEARER_TOKEN takes precedence)
COPILOT_PROVIDER_BEARER_TOKEN
COPILOT_PROVIDER_WIRE_API      # "completions"|"responses" (responses for GPT-5)
COPILOT_MODEL                  # sets both id and wire model (simple option)
COPILOT_PROVIDER_MODEL_ID      # well-known model id for agent CONFIG (separate from wire)
COPILOT_PROVIDER_WIRE_MODEL    # actual model name sent to API
COPILOT_PROVIDER_MAX_PROMPT_TOKENS  # explicit input cap override
COPILOT_PROVIDER_MAX_OUTPUT_TOKENS  # explicit output cap override
```

**Critical separation**: MODEL_ID controls Copilot's internal agent config
(tool support, prompting strategies, token limits) via well-known catalog.
WIRE_MODEL is the actual model name sent to provider API. When MODEL_ID
isn't recognized, agent "falls back to safe defaults" — limiting agent
capability. We could set MODEL_ID=gpt-4o + WIRE_MODEL=gemini-3.5-flash
to get full agent config while routing to Gemini API.

## Design questions

### Q1 — Provider discovery
How does the picker discover which BYOK providers are available?
- env-var introspection (GEMINI_API_KEY, NVIDIA_API_KEY, GITHUB_MODELS_TOKEN,
  + OMLX_RUNNING)
- ~/.config/claude-dev/byok-providers.json declarative config
- something else

### Q2 — Per-provider model discovery
Each provider has a different /models endpoint shape:
- AI Studio: `/v1beta/models` returns name + supportedGenerationMethods
- NIM: `/v1/models` OpenAI-style
- GHM: `/catalog/models` returns rate_limit_tier + limits + capabilities
- Local oMLX: `/v1/models` OpenAI-style

Should picker normalize these? Per-provider adapter classes?

### Q3 — 2D selection policy
Provider × Model candidate space. Selection:
- (a) prefer-provider-first: pick provider by health/quota, then pick model
  within
- (b) prefer-model-first: pick from cross-provider model pool ranked by
  capability/quality
- (c) tier-based: explicit functional tiers (light/heavy/reasoning) →
  pick best across all providers within tier
- (d) shuffle: random across whole space

### Q4 — Ping strategy with 17K Copilot sysprompt context
A liveness ping doesn't include the 17K sysprompt — it tests model
availability but not "does this combo handle Copilot's full agent
context". Options:
- (a) skip ping (per round-2 fan-out's "skip" majority)
- (b) representative ping that approximates Copilot sysprompt size
  (e.g., pad to ~17K with realistic-looking content)
- (c) ping with tool_calls probe + verify response shape
- (d) cached weekly empirical Copilot smoke test (different from ping)

### Q5 — Failure handling (cross-provider)
Provider A fails → try B? Or fail loud?
- Today's NIM iron rule fails loud (no provider fail-over)
- Cross-provider scope MAY benefit from try-next-provider
- But error categories matter: shim cap exceeded → ALL providers may share
  this; rate limit → try different provider; model deprecated → try
  same provider different model

### Q6 — COPILOT_PROVIDER_MODEL_ID separation
Should picker ALWAYS set MODEL_ID to a well-known catalog entry
(gpt-4o, claude-sonnet-4) for full agent config, regardless of WIRE_MODEL?
Or only when the wire model isn't recognized by Copilot's catalog?

### Q7 — Empirical validation required before deploy
What concrete tests must be run BEFORE shipping this picker?
- Smoke test each provider+model combo with realistic Copilot prompt size
- Verify tool_calls response format across providers
- Verify multi-turn ReAct loop completion
- Cost projection (quota burn per picker call)

## Hard constraints

1. Real evidence only. NOT FOUND if you can't verify.
2. Refer to today's discovered Copilot CLI behaviors (`copilot help providers`)
3. Cite real URLs / endpoints / GitHub issues if you bring new evidence

## Output shape (≤800 words)

For each Q (1-7):
- **Recommendation**: specific design choice
- **Source evidence**: cited URL/file/test
- **Confidence**: solid/weak/NOT FOUND

End with:
- **Concrete patch sketch** (helpers.sh-style, ~20 lines)
- **Required empirical validation list** before deploy
- **Top 2 risks**
- **Self-bias note**

**One specific PROCESS warning**: today's session has seen the woozle
effect repeatedly — shared brief framing → all voices converge on the
same wrong answer (e.g., LiteLLM #21041 → "avoid 3.x" → empirical disproved).
For THIS brief: if you cite an issue/blog/etc., explicitly state that
you have NOT empirically verified it. Don't let citation = evidence.
