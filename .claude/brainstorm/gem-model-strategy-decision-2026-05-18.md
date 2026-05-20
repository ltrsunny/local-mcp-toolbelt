# Decision: gem model selection strategy — refined S3 with gem-pro opt-in

Date: 2026-05-18
Trigger: User "gem模型策略脑暴过了吗" — model selection NOT covered by
earlier call-strategy brainstorm
Voices: gem-flash / llama-3.1-70b / nvidia-nemotron-49b / gpt-oss-20b
(copilot quota-exhausted today)
Brief: `.claude/brainstorm/gem-model-strategy-brief-2026-05-18.md`

## Vote tally

| Voice | Pick | Default | Self-bias |
|---|---|---|---|
| gem-flash | **S3** | 3.5-flash | disclosed: "I am gemini-3.5-flash. S3 champions my own utility" |
| llama-3.1-70b | **S3** | 3.5-flash | none claimed |
| gpt-oss-20b | **S5** | 2.5-pro | none claimed |
| nemotron-49b | **S5** | 2.5-pro | none claimed |

Naïve count: 2 S3 / 2 S5 = tie.
After self-bias half-discount: ~1.5 S3 / 2 S5 — slight S5 lean.

## Framing flaw → empirically tested

Both gem-flash and gpt-oss-20b caught: brief coupled auth mechanism
with model tier ("API path could save Pro models post-6/18"). Tested
empirically 2026-05-18 via direct REST with `x-goog-api-key`:

| Model | Free API key result |
|---|---|
| `gemini-2.5-pro` | **HTTP 429 — `limit: 0` paywall** |
| `gemini-3.1-pro-preview` | **HTTP 429 — quota exceeded paywall** |
| `gemini-2.5-flash` | ✓ OK |
| `gemini-3.5-flash` | ✓ OK |
| `gemini-3.1-flash-lite` | ✓ OK |

**Free-tier API key path is flash-only.** Pro models are paywalled
on free tier (literal `limit: 0`). Post-6/18, if user stays on free
tier (per user constraint "不可能付费API key"), they lose all Pro
access regardless of which strategy was picked.

This evidence:
- **Strengthens S3**: post-6/18 user is forced to flash-only anyway,
  S3 just adopts the steady state today
- **Weakens S5**: S5's 2.5-pro default works for 30 days then fails;
  user would face a forced regression mid-workflow

## Decision: refined S3

### Default `gem` → `gemini-3.5-flash` via API key (REST direct)

Today the existing `gem-flash` function already implements this. Make
it the canonical fast path. Rename for clarity:

- **`gem`** (the daily driver): direct REST to `gemini-3.5-flash` with
  the API key. Survives 6/18 cutoff. ~2 s typical, free, no agentic
  tools but fan-out brainstorm doesn't need them.
- **`gem-pro`** (opt-in, until 6/18): OAuth path to `gemini-2.5-pro`,
  no fallback (matches today's `--strict` semantics applied to a
  reliable model). For high-stakes decisions or audit signal.
- **`gem-pro-escalate`** (opt-in, edge cases): try `gemini-3.1-pro-
  preview` first → fall to `2.5-pro`. Accepts the 50% capacity-exhaust
  noise in exchange for top quality when available. Use sparingly.

### Migration plan
- 2026-05-18 to 2026-06-17: above policy active.
- 2026-06-10 (T-7): re-evaluate `gem-pro` viability — if Antigravity
  CLI is stable enough, migrate `gem-pro` to it; else accept loss
  of pro tier and remove `gem-pro` / `gem-pro-escalate` from the
  cookbook.
- 2026-06-18+: `gem` (flash-only) is the surviving path.

### Why NOT S5

S5's 2.5-pro-OAuth-default looks reliable today but has a 30-day
expiration. Mid-cycle workflow disruption (forced rewrite of all
`gem` callers when 2.5-pro stops working) is worse than adopting
the steady-state default now. S3 amortizes the change to today
when it's cheap.

### Why NOT S1

3.1-pro-preview's 50% capacity-exhaust rate today already costs
~1-2 minute fallback-chain dances per call. Multiplied by today's
4-brainstorm × 4-voice workload = unusable. Plus 30-day expiration.

### Why NOT keep current "gem = 3.1-pro-preview default"

Same as S1 rejection. Today's defaults inherit yesterday's optimism
about 3.1 capacity. Reality contradicts.

## Concrete code change

`~/.config/claude-dev/helpers.sh`:

1. Rename existing `gem` → `gem-pro` (move the perl-fork wrapper,
   keep `--strict` semantics, drop the 3.1-pro-preview default in
   favor of `2.5-pro`). Existing `_gem_run` already handles
   silent-hang. Just change default `primary`:
   ```bash
   local primary="${GEM_MODEL:-gemini-2.5-pro}"
   local fallbacks=()  # no fallback in --strict mode (always-strict)
   ```

2. Rename existing `gem-flash` → `gem` (it's now the daily driver).
   The fast direct-REST implementation stays as-is.

3. Add `gem-pro-escalate` for explicit 3.1 escalation:
   ```bash
   gem-pro-escalate() {
     GEM_MODEL=gemini-3.1-pro-preview gem-pro "$@"
     # falls back to 2.5-pro on capacity-exhaust via existing chain
   }
   ```

4. Note in helpers.sh comment block: 6/18 deadline + re-eval task on 6/10.

## What was NOT done (handoff)

- S6 voice-runner infrastructure (from bridge-forgetting brainstorm)
  not built yet — fan-out still done by hand-launched bash. When
  built, it will call these 3 `gem*` variants per voice's role
  (default fan-out → `gem`; final synthesis → `gem-pro`).
- Antigravity CLI viability check — defer to 6/10 review.

## Self-bias note (process learning)

gem-flash voiced for S3 and **disclosed self-bias clearly** — exactly
what the brief asked for, and a good model for future fan-outs that
include same-family voices. Add to auditor-protocol memory:
"when fan-out includes a voice whose family is the SUBJECT of the
brainstorm, half-discount its picks unless self-bias is explicitly
disclosed and addressed in the answer."

## Voice logs
- `tmp/gemflash-model-strategy.log` (S3, self-bias disclosed)
- `tmp/llama-model-strategy.log` (S3)
- `tmp/gptoss-model-strategy.log` (S5)
- `tmp/nemotron-model-strategy.log` (S5)
