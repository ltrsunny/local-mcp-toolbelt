# Brief: Google API possibilities beyond today's decision

Adversarial brainstorm. Synthesizer (Claude) wants to know what was
**missed** in today's gem-call-strategy + gem-model-strategy decisions.

## Today's decision (what to attack)

Three gem variants now live in helpers.sh:
- **`gem`** = `gemini-3.5-flash` via REST direct, x-goog-api-key header
  - Auth: AI Studio free-tier API key
  - Survives 6/18 OAuth cutoff
  - NO agentic tools (pure prompt → text)
- **`gem-pro`** = `gemini-2.5-pro` via OAuth (gemini-cli), no fallback
  - Auth: ~/.gemini/oauth_creds.json (Google AI Pro subscription)
  - **Expires 2026-06-18** (gemini-cli stops serving Pro/free individuals)
  - Full ReAct agentic loop
- **`gem-pro-escalate`** = 3.1-pro-preview → 2.5-pro, OAuth, same expiry

Free-tier API key boundary tested 2026-05-18:
- ✅ gemini-3.5-flash, 2.5-flash, 3.1-flash-lite — free
- ❌ gemini-2.5-pro — `limit: 0` paywall
- ❌ gemini-3.1-pro-preview — paywall

User constraint: **NO paid API key**. Has OAuth Pro subscription.

## What Claude's synthesizer enumerated (CHALLENGE THIS)

| # | Surface | What it might unlock |
|---|---|---|
| 1 | Vertex AI (Google Cloud) | Pro models? $300 credit? Different auth? |
| 2 | OpenAI-compat endpoint (`/v1beta/openai/`) | SDK reuse, same key |
| 3 | Antigravity CLI | 6/18 official migration target |
| 4 | gcloud CLI → Vertex | Different quota pool |
| 5 | Firebase AI / Genkit | Different rate limit? |
| 6 | Google Workspace Gemini | If user has Workspace |
| 7 | Code Assist subscription pool | Distinct from Pro subscription? |
| 8 | Gemini Code Assist for Business | Enterprise SKU |
| 9 | Direct Vertex Garden API | Experimental models |

## Your task

1. **List 3-5 Google API surfaces NOT in the table above**. Be
   specific: API endpoint, auth model, what models it gives access
   to, free-tier status if any.
2. **Attack today's decision**: pick ONE concrete failure mode of
   the gem / gem-pro / gem-pro-escalate split that a missed surface
   would solve. Name the missed surface.
3. **Verify or refute** the 9 surfaces I enumerated — which are
   real, which are hallucinated by me, which have known
   gotchas. Be specific about evidence sources if you cite any
   (URLs, doc page names).
4. **Propose ONE concrete alternative architecture** for gem-pro
   post-6/18: keep OAuth → migrate to Antigravity / Vertex / API
   paid tier / drop pro entirely / something else.
5. **Self-bias note**: if your model family is Google (e.g.
   gemini-*), explicitly flag your pro-Google-ecosystem lean. Other
   voices: flag any blind spots from your own family.

200-400 words. Comment body only. No preamble.
