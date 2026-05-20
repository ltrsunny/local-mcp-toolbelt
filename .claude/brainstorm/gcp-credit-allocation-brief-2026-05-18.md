# Brief: $265 (kr 2,782) GCP credit allocation

Synthesizer (Claude) has NO default preference. Risk presentation
matched. Adversarial brainstorm — pick allocation, attack a competitor,
spot framing flaws.

## Verified facts (today)

User just activated Google Cloud account, has **kr 2,782 ≈ $265 USD**
in promotional credit. No paid billing intent — credit must last as
long as possible. gcloud CLI not yet installed.

Vertex AI Gemini pricing (per Google docs, ≤200K context):
- 2.5-pro: $1.25 input / $10 output per 1M tokens
- 3.1-pro-preview: $2 / $12 per 1M tokens
- 2.5-flash: $0.30 / $2.50 per 1M tokens
- 3.5-flash: **$1.50 / $9** (more expensive than 2.5-pro!)

Cost per typical brainstorm voice call (~1500 in / 400 out):
- 2.5-pro: $0.006
- 3.1-pro: $0.008
- 2.5-flash: $0.0015

Our workload: ~16 voice calls/day → ~500/month → 2.5-pro burns
$3/month. **$265 = 7+ years** at this rate. (Burn-rate reality
check: project ships v0.7 in weeks not years; long horizon may
not matter.)

Other GCP services accessible:
- Vertex AI Model Garden: Anthropic Claude, Meta Llama, Mistral
  (third-party models billable through GCP) — pricing TBD
- Compute Engine GPU VMs — could run larger local models
- Cloud Run / Cloud Build — host MCP server, CI
- Vertex AI Workbench — managed Jupyter for dev
- BigQuery / GCS — not relevant here

OAuth gem-cli **dies 2026-06-18**. gem-pro currently uses OAuth.

## Five candidate allocations (matched-form)

| ID | Primary spend | Monthly burn | What it solves |
|---|---|---|---|
| **A. Pro-migration** | Vertex AI 2.5-pro → replaces gem-pro post-6/18 | ~$3 | Survives 6/18; 7-yr runway |
| **B. Top-tier audit** | Vertex AI 3.1-pro-preview for audits/synthesis only | ~$8 | Best quality on critical decisions |
| **C. Diversity** | Mix Gemini + Anthropic Claude + Llama via Vertex Model Garden | ~$15 | True multi-vendor fan-out |
| **D. GPU VM** | Compute Engine GPU for big local models (e.g. Llama 4 70B) | ~$100/mo if always-on | Capabilities oMLX can't reach |
| **E. Burn-now** | Use ALL credit in 30-60 days on a v0.7 shipping push | $265 in 1-2 months | Concentrated speed-up for product launch |

## Open questions

- Does Vertex AI Anthropic Claude pricing make 3+ vendor fan-out
  realistic on this credit? (verify before banking on C)
- Do 2,782 SEK credits **expire**? 90-day GCP trial credits typically
  do. If yes, A (slow burn) wastes most of it.
- Is the 6/18 cutoff actually a forcing function, or can we keep
  OAuth gem-pro for free until then and Vertex migration just adds
  a safety net?
- Should we reserve credit for v0.7's `omcp install` demo deployment
  (Cloud Run hosting reference install) vs spending on inference?

## Your task

1. **Pick A-E or invent F/G** with concrete sub-allocation %.
2. **Attack the strongest competitor** — concrete failure mode.
3. **Verify or refute one shaky claim in this brief** (e.g. 7-yr
   runway, third-party model pricing, credit expiration).
4. **Spot a framing flaw** if any. (Author wrote it under time
   pressure — likely blind spots.)
5. **Self-bias note**: same-family voices flag your lean.

200-400 words. Comment body only.
