# Decision: GCP credit hybrid burn-now (5-lane structured allocation)

Date: 2026-05-18
Trigger: User "Google cloud 已激活，共 kr2,782 赠金你干什么用能用？"
Voices: gem-pro / mixtral-8x22b / gpt-oss-20b / llama-3.1-70b
Brief: `.claude/brainstorm/gcp-credit-allocation-brief-2026-05-18.md`

## Decisive fact (verified post-fan-out)

Google Cloud free trial credit **expires 90 days from signup**,
regardless of usage speed. Quoted from official docs:

> "Your remaining credit must be consumed within the original 90 days
> period from your sign-up date."

Account auto-closes when 90 days pass OR $300 spent (whichever first).
30-day grace to upgrade to paid, then resources deleted.

User constraint: NO paid upgrade. So **fixed 90-day burn window**.

## Voice tally (and why simple count was wrong)

| Voice | Pick | Critical claim |
|---|---|---|
| gem-pro | E (Burn-now 100%) | "Credits expire 90 days = guaranteed waste of slow burn" |
| mixtral-8x22b | A (70% pro-migration + 20% v0.7 + 10% migration) | "Need ongoing path, balance" |
| gpt-oss-20b | A (100%) | "7-year runway is myth, expires in 87 days" |
| llama-3.1-70b | E (Burn-now 80/20) | "Credit expiration unclear, needs verification" |

Naïve count: A=2 / E=2 tie. But **3 of 4 voices independently raised
expiration as the dominant constraint** — mixtral's A pick implicitly
contradicts itself (recommending allocation that ignores its own
mentioned-but-undervalued time horizon). Real signal: E framework wins.

gem-pro disclosed self-bias toward GCP services — partial discount,
but its claim is now empirically verified (not bias-driven).

## Decision: hybrid burn-now with 5-lane structured allocation

Treat credit as a 90-day **forcing function** to do high-leverage things
otherwise infeasible. NOT "spend it all on inference faster". Lanes:

### Lane 1 — Inference: ~30% (~$80) — DEFERRED 2026-05-18

User decision 2026-05-18: "等失效再说" — defer gem-pro migration
until 6/18 OAuth cutoff actually lands. Rationale: 45 min
engineering today buys 60 days post-6/18 continuation, but
~8/16 credit expires anyway → still permanent loss of Pro tier.
Defer keeps option open without premature commitment to Vertex
pipeline. **Re-evaluate on 6/18** when OAuth gem-pro actually
fails — by then either (a) decide to migrate (~15 min if other
lanes already used gcloud), (b) accept Pro-tier loss, or (c)
test Antigravity CLI as alternative.

Original allocation if executed:
- Migrate `gem-pro` from OAuth (dies 6/18) to Vertex AI 2.5-pro
- Buys ~60 days post-6/18 of continued Pro access via credit
- Daily fan-out workload: ~$3/month, ~$9 over 90 days
- Aggressive experimental Pro calls (eval re-runs, audit
  rounds skipped today due to OAuth quota): ~$70

### Lane 2 — Vertex Model Garden (Anthropic / Llama / Mistral): ~15% (~$40)
- True multi-vendor fan-out — Anthropic Claude as a voice, not just
  through me (Claude orchestrator). Different inference quota pool.
- 3+ provider diversity that NIM gateway can't reliably offer (NIM
  catalog instability — verified today 70%+ of fresh models 404)
- Validate pricing before banking on this lane

### Lane 3 — Compute Engine GPU spike: ~25% (~$65)
- Spin up N1/T4 or L4 GPU VM for **local model benchmarking**
- Test Qwen3-30B-A3B-Instruct (17.2 GB disk, **doesn't fit 16GB Mac
  unified memory**) on cloud GPU to decide whether to upgrade dev
  hardware OR pursue MoE-2bit-quant for fit
- Also test Llama 4 Scout, Mistral Small 3, DeepSeek-V3-Lite —
  candidates oMLX path can't currently run
- Spike use only — kill VM after each benchmark (hourly billing)
- Result feeds Tier B/C/D selection memo for v0.8+

### Lane 4 — Cloud Run hosting v0.7 install demo: ~15% (~$40)
- Reference deployment of `omcp install` so users can try without
  installing first
- Real product value tied to v0.7 ship
- Cloud Run scales to zero between requests — actual cost likely
  <<$40, but reserve

### Lane 5 — Reserve / overruns: ~15% (~$40)
- Unknown unknowns
- One-shot scope-memo Auditor rounds via Vertex 3.1-pro
- ~Aug 10 emergency burn if other lanes underused

## Timeline

- **Today** (May 20): user installs `gcloud-cli`, runs
  `gcloud auth application-default login`, sets project. ~30 min.
- **Week 1** (by May 27): migrate gem-pro to Vertex (Lane 1).
  Modify helpers.sh `gem-pro` to use `gcloud auth print-access-token`
  against Vertex endpoint instead of gemini-cli OAuth.
- **Week 2-3**: spin up first Compute Engine GPU benchmark (Lane 3).
- **Week 4-6**: deploy v0.7 install demo to Cloud Run (Lane 4).
- **Week 8-12**: Reserve burn (Lane 5) before 8/16 expiration.

## What NOT to do

- **NOT pay** to extend past 90 days (user constraint)
- **NOT do Lane 3 always-on GPU VM** (always-on T4 ≈ $250/month →
  one VM burns the lane in 3 weeks)
- **NOT bank on Antigravity CLI** as a fallback — it's
  unverified migration target; we now have Vertex AI as the
  primary path
- **NOT pre-commit Lane 5** — it's reserve, evaluate at 60-day mark

## Process learning

3/4 voices independently caught the 90-day expiration the brief
buried in "Open questions". Synthesizer (Claude) listed it as
"unclear" but didn't WebFetch-verify before writing options. **Add to
auditor-protocol memory**: when a brief has time-bounded resources
(credit, quota, subscription), **verify the expiration up-front**
before enumerating options — otherwise the option set is built on
a phantom horizon.

## Voice logs
- `tmp/gempro-gcp-credit.log` (E 100%, self-bias disclosed)
- `tmp/mixtral-gcp-credit.log` (A 70%/20%/10%, fresh-today voice)
- `tmp/gptoss-gcp-credit.log` (A 100%, OpenAI lens)
- `tmp/llama-gcp-credit.log` (E 80/20)
