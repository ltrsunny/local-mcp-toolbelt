# Brief: design F + H implementations for v0.6.0 release gate

You are a senior engineer reviewing a small implementation design.
Output one Markdown response, 250-450 words. Be concrete — name files,
APIs, assertions. End with a clear recommendation. No preamble.

## Context

`local-mcp-toolbelt` is an Apache-2.0 MCP server. v0.6.0 release prep
just rejected the carry-over "Phase 1 LLM-judge eval rerun" plan
after a 3:0 fan-out (copilot + gem + llama-3.3-70b agreed). The new
release gate is a **F + H + G hybrid**:

- **F**: programmatic gold-match for structured tasks (classify,
  extract) — JSON comparison, no LLM-judge.
- **H**: 2-3 behavioural unit tests asserting per-tool thinking-mode
  defaults are observable in backend output.
- **G**: dogfood this session + a 7-day post-release window. Already
  in motion; no design needed.

Your job: design F and H.

## Existing state

- Runner already produced 25 inferences (5 fixtures × 5 trials,
  3 tiers) under v0.6.0 defaults — JSONL files at
  `packages/core/tests/eval/runs/`.
- Fixtures live at `packages/core/tests/eval/fixtures/0{1..5}-*/`
  with `gold.json` (structured tasks) or `gold.md` (prose).
- Existing harness: `runner.mjs` → JSONL; `judge.mjs` (Anthropic
  API, not running this release); `report.mjs` markdown matrix.
- 170 unit tests pass via `vitest`. Layout:
  `packages/core/tests/unit/*.test.ts`.
- `disableThinking` is now wired into `lib/invoke.mjs` per the
  v0.6.0 per-tool defaults; the registry is at
  `src/config/thinking-defaults.ts`.

## F: programmatic gold-match scorer

Open design questions for you to answer:

1. **Where does the scorer live**? Options:
   - (a) New `tests/eval/scorer.mjs` parallel to `judge.mjs`.
     Reads runs/*.jsonl, emits pass/fail per row + summary.
   - (b) Extend `report.mjs` directly with programmatic-only path
     (no judge step).
   - (c) Inline into `runner.mjs` — score as you go, store in JSONL.

2. **What's the comparison rule for `classify`** (`gold.json` has
   `{labels: [...], reason?: string}`):
   - Set equality on `labels` (canonical answer)?
   - F1 / Jaccard tolerance for `allow_multiple` cases?
   - Ignore the `reason` field entirely, or include it in score?

3. **What's the comparison rule for `extract`** (`gold.json` is
   arbitrary nested object matching `schema.json`):
   - Deep structural equality (strict)?
   - Field-by-field with type-aware tolerance (numbers within ε,
     strings case-insensitive)?
   - Schema-validity-only as a fallback when content differs but
     shape is right?

4. **Pass/fail bar for the release gate**: every trial must score
   1.0, or a mean across trials? What's the trial-level threshold?

## H: behavioural unit tests for thinking-mode

The point of v0.6.0's per-tool defaults: `summarize*` runs WITHOUT
reasoning trace (faster, tighter output); `classify`/`extract`/
`transform`/`diff-semantic-index` run WITH reasoning trace (better
accuracy).

Open design questions:

1. **Where do the assertions go**?
   - Existing test file in `tests/unit/`? Which one?
   - New `tests/unit/thinking-mode-behavioural.test.ts`?

2. **What's observable in backend output that proves thinking on/off**?
   - `<think>...</think>` tokens in the raw text response?
   - A separate `reasoning_content` field (oMLX exposes this when
     thinking is on)?
   - Latency difference (probably too noisy for a unit test)?

3. **Do these run against real oMLX, or a recorder mock**?
   - The existing unit harness uses `RecorderBackend` (no real
     oMLX). Mock can verify the `disableThinking` flag flows
     correctly but cannot verify *real* thinking behavior. Real
     oMLX in unit tests is forbidden (CI doesn't have it).
   - So: assert the boundary signal (`disableThinking: true|false`
     reaches `MlxHttpBackend.chat`'s outgoing request body) AND
     leave the behaviour validation to dogfood (G).

4. **How many tests**? Each per-tool? Or one parameterised over
   the registry?

## Your task

Pick ONE concrete design for F and ONE for H. Push back if you spot
a flaw in this framing. Be specific: file paths, function names,
assertion shape. Recommend the gating threshold for F.

Output: comment body only — no preamble, no meta-discussion.
