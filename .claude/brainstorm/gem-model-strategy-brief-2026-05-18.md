# Brief: gem model selection strategy

You are one of 4 adversarial voices. Synthesizer has NO default
preference. Risk presentation matched across all strategies.

## Today's evidence (verified, not speculated)

1. **Available OAuth models** (`gem` path, Pro subscription, free):
   - `gemini-3.1-pro-preview` — top quality but capacity-exhaust 429
     frequently (~50% of calls today); silent-hang ALSO observed
     pre-fix (fixed 2026-05-18 via fork+pgkill timeout)
   - `gemini-2.5-pro` — reliable, returns in 5 s for short prompts
   - `gemini-2.5-flash` — fast fallback
   - `gemini-3.1-flash-lite` — cheap, fast (untested in `gem`)

2. **Available API-key models** (`gem-flash` path, free tier):
   - `gemini-3.5-flash` — verified working today via direct REST;
     fast (1-2 s), capable for short tasks, not agentic
   - `gemini-2.5-pro` also reachable but `gem` already serves it
   - 50 total models in account, including 3.1-pro-preview
     (potentially reachable via API key path — UNTESTED)

3. **Auth path deadline**: 2026-06-18 OAuth cutoff for free Pro users
   (gem-cli will stop serving) — so the OAuth-default strategy has a
   30-day expiry, hybrid or API-only strategies survive

4. **Workflow today**: 4 brainstorms in parallel fan-out × 4 voices
   = ~16 gem-equivalent calls/day. Tasks: adversarial brainstorm,
   summarize, extract, classify. Almost zero agentic (file/shell)
   work via `gem`.

## Five candidate strategies (matched-form, 1 sentence each)

| ID | Default | Fallback chain | --strict | gem-flash niche |
|---|---|---|---|---|
| **S1** Quality-first | 3.1-pro-preview | 2.5-pro → 2.5-flash | no fallback | explicit speed jobs only |
| **S2** Reliability-first | 2.5-pro | 2.5-flash → 3.1-flash-lite | no fallback | explicit speed jobs |
| **S3** Speed-first | 3.5-flash (API) | 2.5-flash (OAuth) | OAuth 2.5-pro single | inverse: gem-pro for quality |
| **S4** Tier-explicit | none — user must specify | none | n/a | required for flash tier |
| **S5** Auth-aware hybrid | 2.5-pro (OAuth) | 2.5-flash → 3.5-flash(API) | OAuth 2.5-pro no fallback | dedicated for fan-out workload |

## Cost/benefit per strategy (matched-form, 2 bullets each)

| ID | Cost | Benefit |
|---|---|---|
| S1 | 50% of `gem` calls hit 3.1 capacity exhaust → slow fallback dance every call | Best quality when 3.1 IS available; familiar (= current) |
| S2 | Surrenders 3.1-pro-preview top-tier quality; locks in older model | Reliable; predictable latency; no fallback noise |
| S3 | Loses agentic capability for default `gem`; API quota concerns | Fast (~2 s); newest model (3.5); reliability matches API SLA not OAuth |
| S4 | UX friction (user must remember which gem variant) | Explicit intent; no surprises; teaches caller the cost model |
| S5 | More functions to maintain (`gem`, `gem --strict`, `gem-flash`, possibly `gem-pro`); auth path drift | Survives 6/18 cutoff naturally; matches actual workload (fan-out=flash, decision=pro); each path single-purpose |

## Your task

1. **Pick S1-S5 or invent F/G.** Single answer; no "depends".
2. **Attack the strongest competitor** — concrete failure mode tied
   to today's workload (4 brainstorms × 4 voices × adversarial fan-out).
3. **Refine your pick**: write the actual default + fallback chain +
   `--strict` behavior + when-to-use-which-variant matrix.
4. **Spot a framing flaw** in this brief if you see one. (Author
   wrote both options and evidence — possible blind spots.)
5. **Self-bias check** if your model family is Google: flag any
   pro-Google-ecosystem lean. Other voices: ditto for your family.

200-400 words. Comment body only. No preamble.
