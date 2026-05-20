# Decision: v0.7+ strategy revised — embedding tier > multi-client; +2 missing axes

Date: 2026-05-18
Trigger: User "策略对抗性脑暴 + 检查 bridge 利用率"
Voices: ghm@openai/gpt-4.1, ghm@deepseek/deepseek-v3-0324,
ghm@meta/meta-llama-3.1-405b-instruct (empty), ghm@cohere/cohere-
command-a, nv_pro@mistralai/mistral-large-3-675b-instruct-2512
(cross-platform), gem-pro (cross-platform — TIMED OUT 180s)
Brief: `.claude/brainstorm/v07-strategy-validation-brief-2026-05-18.md`

## Methodological caveat first

Initial 4-voice fan-out used ONLY `ghm` (GitHub Models PAT) — all
voices routed through one infrastructure (Azure-GitHub). PM flagged
"为什么只用了 ghm" mid-stream. Anti-pattern: **platform-mono fan-out
= family diversity ≠ platform diversity**. Codified as #14 in
auditor-protocol.md. Cross-platform validation added afterward:
NIM (mistral-large-675b) CONFIRMED the 3 ghm-consensus findings;
gem-pro (Google OAuth) TIMED OUT at 180s (silent-hang fix correctly
caught the hang — API itself unstable today). Final platform diversity:
2 (GitHub Models + NIM), 4 effective voices.

## Reversed claim

**Original (single-source) claim by Claude**:
> "v0.7 → v0.8 之间最高 leverage 单项 = 多 MCP 客户端原生支持
> (直接扩用户基数 N×)."

**Reversed (4/4 cross-platform voice consensus)**:
> "**Multi-client = horizontal sprawl, marginal leverage.**
> **Embedding tier (`bge-m3-mlx`) > multi-client by step-function**
> (unlocks unique semantic-index UX no competitor offers)."

## Reasoning (voice-derived)

- **gpt-4.1**: "Multi-client merely broadens audience but doesn't
  deepen utility. Embedding tier delivers bigger leverage —
  semantic search opens novel UX and new use-cases."
- **deepseek-v3**: "Multi-client fractures effort for marginal
  gain. Embedding tier unlocks semantic diff/search — defensible
  moat. Risk: if deferred, llama-index owns this space."
- **cohere-command-a**: "Multi-client is table stakes; embeddings
  are differentiation."
- **mistral-large-675b** (cross-platform): "Multi-client doubles
  surface area — Cursor/Zed devs aren't waiting; they clone
  repos. Embedding tier (bge-m3-mlx) is viral feature — users
  share indexed repos; token savings scale exponentially with
  repo size."

## Two newly-identified missing axes (3/4 voices)

### Missing #1: Latency optimization (3/4 voices)

- deepseek-v3: "Current ~600ms for short prompts is fatal for
  editor integration (Cursor users expect <200ms)... Action:
  Instrument --profile flag in v0.7, optimize hot paths in v0.8."
- cohere-command-a: "Profile and optimize the slowest 20% of
  operations (e.g., config merge, model downloads) to sub-
  300ms. Publish benchmarks to prove competitiveness."
- mistral-large-675b: "Optimize for perceived throughput
  (parallel hook dispatch)."

### Missing #2: Publishable eval / benchmarks (2/4)

- gpt-4.1: "Zero mention of systematic evaluation or real
  measurements. High-visibility benchmarks could drive
  credibility — public leaderboard, screencast demo, X% token
  saving in real project."
- mistral-large-675b: "Demonstrable token savings — published
  benchmarks, artifact evals — turns a 'nice CLI' into product.
  omcp-bench GitHub Action."

## Revised v0.7+ direction map

### v0.7 themes (UNCHANGED — voices agreed on the 4)

Confirmed by 4/4 voices on rank ordering (with disagreement on
which is #1 — zero-friction-install vs platform-clarity):

1. Zero-friction install (`omcp install`)
2. Platform clarity (Linux/Windows fail-fast)
3. Lifecycle完整 (install + uninstall + --verify)
4. Single-MCP-client first (lowest rank — table stakes)

### v0.8+ priority REVERSED

| Original (Claude single-source) | Revised (voice consensus) |
|---|---|
| #1 multi-client native | #1 **embedding tier `bge-m3-mlx`** |
| #2 sentinel + upgrade path | #2 latency optimization (`omcp install --profile`, sub-300ms) |
| #3 npx vs npm-g | #3 publishable eval / benchmarks (`omcp-bench`) |
| #4 SEP-2663 negotiation | #4 multi-client (demoted from #1 — horizontal, not differentiating) |
| #5 embedding tier (was bonus) | #5+ sentinel, upgrade-path, npx-vs-npm, SEP-2663 (demoted) |
| #6 observability | #6 observability (cohere/mistral both raised — was already on radar) |

## Bridge utilization audit (parallel request)

Session-wide stats:
- 169 bridge calls / 369 Read / 27 WebFetch / 1220 Bash / 351 Edit
- tmp/*.log specifically: 35 raw-Read / 33 bridge-extract = **48% compliance**

Time-bucket:
- Pre-compact: 27 raw / 11 bridge = **28% compliance**
- Post-compact first brainstorm (commit-hygiene): 8 raw / 0 bridge = **0%**
- Post-compact after PM callout: 0 raw / 22 bridge = **100%**

Pattern: **external reinforcement triggers correction; self-driven
discipline insufficient**. Same callout triggered today's pivot
from 28% → 100% on the post-compact stream. The 22 consecutive
post-callout bridge.extract calls show: once pattern locks in,
it holds. The question is whether it survives session boundaries
and context-compactions.

## Process learnings

- Anti-pattern #14 (platform-mono) codified in
  auditor-protocol.md memory
- **My v0.7→v0.8 leverage claim reversed by adversarial fan-out**
  — single-source synthesis underestimated unique-feature
  differentiation (embedding) and overestimated user-base
  expansion (multi-client). 4/4 voices reject; 1 cross-platform
  voice confirms. Confidence high.
- gem-pro Google OAuth path unstable today (180s timeout) —
  silent-hang fix held; API capacity is the issue

## Voice logs
- `tmp/ghm-gpt41-v07-strategy.log` (zero-friction #1; eval/benchmarks missing)
- `tmp/ghm-deepseekv3-v07-strategy.log` (platform-clarity #1; latency missing)
- `tmp/ghm-llama405-v07-strategy.log` (EMPTY — discount)
- `tmp/ghm-cohere-v07-strategy.log` (zero-friction #1; latency missing)
- `tmp/nv-mistral-v07-strategy.log` (platform-clarity #1; cross-platform confirms all)
- `tmp/gempro-v07-strategy.log` (timeout — gem-pro 2.5-pro unstable)
