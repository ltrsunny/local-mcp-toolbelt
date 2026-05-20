# Brief: gem call strategy — 30 days to June 18 OAuth cutoff

You are one of 4 adversarial voices. The synthesizer has NO default
preference. Risk presentation matched across all options.

## Today's evidence (not speculation)

1. `gemini-3.5-flash` released, marked Stable in docs
2. **GitHub issue #27258** (open 2026-05-19, status need-triage): the
   model returns 404 via gemini-cli 0.42.0 OAuth path. Works only
   with AI Studio API key from aistudio.google.com.
3. **Google migration notice**: "On June 18, 2026, Gemini CLI and
   Gemini Code Assist IDE extensions will stop serving requests for
   Google AI Pro and Ultra, as well as those using it free of charge
   using Gemini Code Assist for individuals" → 30 days from today
4. Migration target: Antigravity CLI / Antigravity 2.0
5. API paid and enterprise users continue
6. Today's gem hangs on `gemini-3.1-pro-preview` are **silent**
   (empty body, no error markers) — current helpers.sh perl-alarm
   fallback chain (3.1-pro-preview → 2.5-pro → 2.5-flash) doesn't
   trigger on silent hang because it watches for capacity-error
   markers in stderr that never appear
7. `gemini-2.5-pro` works reliably today via OAuth

## User state

OAuth Pro subscription. `~/.gemini/oauth_creds.json` exists. No
`GEMINI_API_KEY`. Affected by June 18 cutoff. gem is currently 1 of
4 voices in fan-out portfolio (others: copilot, NIM, bridge).

## Options (matched-form)

| ID | Move | Short-term cost | Short-term benefit | Long-term cost | Long-term benefit |
|---|---|---|---|---|---|
| A | Switch to AI Studio API key now (deprecate OAuth) | One-time setup; lose Pro quota benefit | Unlock 3.5-flash today; survives 6/18 cutoff | API-based pricing (free tier per-day caps) | Stable path |
| B | Stay OAuth Pro until 6/18; migrate then | Zero today; can't use 3.5-flash | Maximal Pro quota for 30 days | Forced migration in 30 days; risk of last-minute scramble | Maximize current free quota |
| C | Hybrid: keep OAuth for Pro models + API key for 3.5-flash | Both auth setups | Best of both today | Still must migrate OAuth before 6/18 | More flexibility |
| D | Drop gem from voice portfolio entirely; rely on copilot + NIM + bridge | Lose Google viewpoint in fan-out | No more gem hangs; simpler ops | Reduced voice diversity (3 instead of 4) | Insulated from gemini-cli deprecation entirely |
| E | Migrate to Antigravity CLI now (preview/beta) | Tool churn; possibly less stable | Get ahead of 6/18 cutoff | Antigravity may evolve or itself deprecate | Forward-leaning |

Orthogonal fix (regardless of A-E): **helpers.sh gem function needs
mid-call silent-hang detection** — current fallback only fires on
capacity-error markers; today's hang was 10+ minutes of zero output.
Add max-wait per model attempt before falling through.

## Your task

1. **Pick A/B/C/D/E** or propose F/G.
2. **Attack the strongest competitor** with a concrete failure mode.
3. **Refine your pick**: if A, what API-key-tier choice and rate-limit
   plan; if D, what voice replaces gem; if E, which Antigravity version
   and migration window.
4. **Diagnose**: should the helpers.sh silent-hang fix be done
   independently of A-E, or only inside one option?
5. **Spot the brief's framing flaw** if any.

200-400 words. Comment body only.
