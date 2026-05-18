# Brief: deeper audit of the F+H+G plan — push the framing one more level

You are a senior engineer pushing back on the previous round's
synthesis. Output 250-400 words. End with one explicit recommendation.
No preamble.

## Context (what's been decided)

`local-mcp-toolbelt` v0.6.0 release prep:

- Round 1: chose Anthropic judge — REVERSED by PM (no budget).
- Round 2: rejected the entire Phase 1 LLM-judge eval rerun. 3:0
  consensus on **F+H+G hybrid**:
  - F: programmatic gold-match scorer for classify/extract
  - H: behavioural unit tests for thinking-mode default propagation
  - G: dogfood (this session + 7-day window)
- Round 3: F+H implementation design fan-out (4 voices). Strong
  consensus: F lives in NEW `tests/eval/scorer.mjs`; H lives in NEW
  `tests/unit/thinking-mode-behavioural.test.ts`; H asserts the
  `disableThinking` boundary propagation (NOT `<think>` tokens —
  Gem caught this contradiction explicitly).

## What got snuck in by the synthesiser (unaudited)

The synthesiser (Claude) introduced two specific choices that NONE
of the 4 voices in Round 3 voted on:

1. **Threshold compromise**: F gate set at "mean ≥ 0.90 AND no trial
   < 0.75". Round 3 voices split 3:1 on 0.95 vs 0.80. Claude picked
   middle ground as own decision, not synthesis.
2. **F existence not interrogated**: the F+H+G framing was established
   in Round 2 but nobody asked the next-level question: **Is F doing
   real work that H + G don't already cover?**

## The three open questions

### Q1: Is F redundant?

- H verifies the boundary signal (`disableThinking` flag flows
  correctly from `THINKING_DEFAULTS` registry → backend chat
  options). If H passes, the v0.6.0 wiring is correct.
- F is a quality check — "did the model produce structurally correct
  output under the new defaults". But:
  - The MODEL hasn't changed in v0.6.0 (still Qwen3-4B/8B/14B).
  - Only the THINKING MODE wiring changed.
  - F mainly catches MODEL regressions, which dogfood (G) catches too.
  - F adds ~80 LOC + maintenance burden + a new gate that can become
    flaky as the local LLM jitters across runs.
- Counter-argument: F is cheap to write once; catches some classes of
  bugs that boundary-only H + behavioural G might miss (e.g. server.ts
  bug routing wrong tool to wrong tier).

### Q2: Is the 0.90/0.75 threshold defensible?

- Claude's compromise: mean ≥ 0.90, no trial < 0.75.
- Round 3: Gem argued 1.0 is too brittle; said 0.80. Copilot/Llama/
  Ministral wanted 0.95. NOBODY picked 0.90/0.75.
- Is there a principled reason for this exact split, or is it an
  unaudited "split the difference" move?

### Q3: Should the runner's 25-inference JSONL be committed?

- The data was produced by a methodology (Phase 1 rerun) the project
  has now rejected.
- Commit value: shows the runner can produce output, dogfood-trace.
- Commit cost: 25 × ~few-KB rows of model output that don't gate any
  release decision. Future readers may mistake it for an active eval.

## Your task

Pick a concrete recommendation across these three:

- (a) Skip F entirely. Ship v0.6.0 with H + G only. Add F in v0.6.1
  if dogfood surfaces a regression.
- (b) Keep F but defend a specific threshold (with reasoning).
- (c) Keep F, revisit threshold per-fixture or per-tier (not global).
- (d) Some option Claude hasn't considered.

Plus: commit or discard the runner JSONL?

Be concrete. Push back on the framing if you spot a flaw. Output:
comment body only, no preamble.
