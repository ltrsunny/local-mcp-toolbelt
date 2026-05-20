# Decision: Google API possibilities — today's decision stands; one bonus

Date: 2026-05-18
Trigger: User pushback "Google api 还有什么其他可能性，对抗性脑暴"
Voices: gem-pro / gpt-oss-20b / llama-3.1-70b / mistralai/mistral-large-3-675b
Brief: `.claude/brainstorm/google-api-possibilities-brief-2026-05-18.md`

## Headline result

Today's gem / gem-pro / gem-pro-escalate split **stands as the right
minimum given user's "no paid API" constraint**. The fan-out found:

1. **ZERO** free path to Gemini Pro models post-6/18 (under user's
   no-paid constraint)
2. **ONE** genuine technical bonus worth adopting: OpenAI-compat
   endpoint for protocol flexibility (does not expand model access)
3. **THREE** voices independently hallucinated a "Vertex AI free
   tier" that **does not exist**

## Verified facts (not voice claims)

| Surface | Real? | Free for our use? | Pro models? | Survives 6/18? |
|---|---|---|---|---|
| AI Studio API key (current `gem` path) | ✅ | ✅ flash-only | ❌ paywalled `limit:0` | ✅ |
| OpenAI-compat at `/v1beta/openai/` | ✅ verified live | ✅ same free tier | ❌ same paywall | ✅ |
| Vertex AI Gemini | ✅ | ❌ no always-free; $300 trial only (90 days) | ✅ if paid | n/a |
| Antigravity CLI (announced) | ✅ GitHub issue confirms | ❓ unverified | ❓ unverified | ✅ (the migration target) |
| OAuth `gem-pro` (current) | ✅ | ✅ free under Pro sub | ✅ 2.5-pro, 3.1-pro | ❌ dies 6/18 |
| Workspace Gemini | ✅ | ❌ requires Workspace SKU | depends | n/a |
| Apps Script + Gemini | ✅ | ✅ within scripts | flash-only | ✅ |
| Chrome `window.ai` (Gemini Nano) | ✅ | ✅ browser-bound | Nano only (on-device) | ✅ |
| Firebase Genkit | ✅ but = Vertex wrapper | follows Vertex | follows Vertex | follows Vertex |

## What was hallucinated (don't act on these)

- `gpt-oss-20b`: "Notebook API generative-cloud private preview",
  "pro-gen1", "gemini-4", "Codelabs AI Integration endpoint",
  "Vertex Sandbox Scratchpad REST". None of these are documented
  Google products as of 2026-05-18.
- `mistral-large-3-675b`: "Vertex AI 0.5M tokens/month free tier".
  Verified via cloud.google.com/free docs: **does not exist**.
  Google's own free-tier docs explicitly point users back to AI
  Studio for free Gemini access.
- `llama-3.1-70b`: listed Natural Language API, Text-to-Speech,
  AutoML, Dialogflow — all real GCP products, but **not Gemini
  chat APIs**. Voice misunderstood the question.
- My (Claude's) "Code Assist subscription pool" (#7 in brief):
  3/4 voices flagged as hallucinated. Confirmed — there is no
  documented quota pool distinct from Pro subscription.

## Concrete action items

### 1. Add `gem-openai` variant (OpenAI-compat endpoint)

A sibling to `gem` that uses the OpenAI protocol shape via
`/v1beta/openai/chat/completions`. Same API key. Use case:
when a workflow already expects OpenAI-shape responses (e.g.
calling from a tool that speaks OpenAI's JSON schema natively).

```bash
gem-openai() {
  curl -sS --max-time "${GEM_TIMEOUT:-90}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${GEMINI_API_KEY}" \
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" \
    -d "$body"
}
```

Defer implementation — not blocking. Add only when a concrete
caller needs it.

### 2. Antigravity CLI evaluation (defer to 6/10)

The only genuinely unknown post-6/18 path. Need to evaluate:
- Does Antigravity inherit existing Pro subscription? (auth path)
- Does it expose Pro models (2.5-pro / 3.1-pro)?
- Stability / preview status by 6/10
- Drop-in replacement for `gem-pro` agentic ReAct loop?

Schedule a 20-min check on 2026-06-10 (T-7 days). If yes →
migrate `gem-pro` to Antigravity. If no → accept loss of Pro
tier post-6/18; `gem` (flash via API) is the only path.

### 3. No other changes

Today's helpers.sh setup is the right minimum. Don't add
Vertex / Workspace / Apps Script paths — they cost money or
require contracts the user doesn't have.

## Process learnings

- **Hallucination amplifies under specificity**: 3/4 voices
  invented specific API endpoints (`pro-gen1`, `gemini-4`,
  `0.5M tokens/month free`) that don't exist. WebFetch
  verification was essential to filter.
- **Voice consensus ≠ truth**: 3-voice convergence on "Vertex AI
  as post-6/18 path" was wrong; required reading the actual
  pricing/free-tier docs to disprove.
- **Self-bias direction matters**: gem-pro (Google native) was
  MORE specific and partially MORE accurate than the
  non-Google voices, but also more inclined to push Vertex AI
  as the "right" answer (per its own self-disclosure: "bias
  towards Google Cloud ecosystem as the most robust... solution").
  Discount accordingly.

Codify into auditor-protocol memory: **add "WebFetch-verify any
specific API endpoint name a voice introduces before acting on
it" as anti-pattern #N+1**. Voices invent plausible names.

## Voice logs
- `tmp/gempro-google-api.log` (gem-pro, Google self-audit)
- `tmp/gptoss-google-api.log` (gpt-oss-20b, heavy hallucination)
- `tmp/llama-google-api.log` (llama-3.1-70b, off-topic)
- `tmp/mistral-large-google-api.log` (mistral-large-3-675b, partial accuracy)
