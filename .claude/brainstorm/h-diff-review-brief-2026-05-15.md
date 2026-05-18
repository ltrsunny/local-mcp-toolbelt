# Brief: review the H implementation diff before commit

You are reviewing the actual code diff for v0.6.0's "H" release gate
— behavioural unit test for thinking-mode propagation. This is the
final fan-out before commit. 4 prior fan-out rounds in this session
already landed: F (gold-match scorer) rejected as category error
against v0.6.0's wiring-only changes; H + G (dogfood) chosen.

Output 200-400 words. End with one explicit verdict: SHIP / REVISE /
BLOCK. No preamble.

## The diff under review

**NEW file** (232 lines):
`packages/core/tests/unit/thinking-mode-behavioural.test.ts`

**Existing file modified earlier this session** (153 lines after edit):
`packages/core/tests/eval/lib/invoke.mjs` — added per-tool
`disableThinking` wiring based on `THINKING_DEFAULTS` registry so
the eval harness now exercises the same defaults as the server.

Vitest result: 206/206 pass (was 193 before this diff). Test count
delta = +13 (the new file). No existing tests broke.

## What the test asserts

Three describe blocks in `thinking-mode-behavioural.test.ts`:

1. **Registry defaults** — for each of 6 sync tools (`summarize`,
   `summarize-long`, `summarize-long-chunked`, `classify`, `extract`,
   `transform`) call the tool via MCP `client.callTool` with no
   `thinking` arg. Assert that `RecorderBackend.recorded[i].args.
   disableThinking === (THINKING_DEFAULTS[tool] === 'off')`. For
   chunked summarize, every recorded chat call must carry the same
   flag.

2. **Per-call override** — 4 assertions: `thinking='off'` on classify
   (inverts default ON), `thinking='on'` on summarize (inverts default
   OFF), `thinking='auto'` on each (yields registry default).

3. **Env-var overrides** — 3 assertions: `OMCP_THINKING_MODE=on`
   flips summarize, `OMCP_THINKING_CLASSIFY=off` flips classify,
   per-tool env beats global.

`diff-semantic-index` is intentionally not exercised here (input
shape requires git-diff format + accessor). The file comment justifies
this: identical wiring path at `server.ts:1010`; resolver unit test
already covers the registry contract for it.

## Source files (read them at paths)

- `/Users/rd/ollama-claude/packages/core/tests/unit/thinking-mode-behavioural.test.ts`
- `/Users/rd/ollama-claude/packages/core/tests/unit/recorder-client.ts`
  (the RecorderBackend test double — how `recorded.args` is captured)
- `/Users/rd/ollama-claude/packages/core/src/config/thinking-defaults.ts`
  (the registry under test)
- `/Users/rd/ollama-claude/packages/core/src/mcp/server.ts` lines
  1010, 684, 783, 880, 371, 459, 554 (the 7 `resolveThinking(...)
  === 'off'` call sites the test is gating)

## Your audit questions

1. Does the test assert the contract we actually care about, or is
   there a false-positive path (test passes but real wiring breaks)?
2. Is `diff-semantic-index` skip justified by the file comment, or is
   it a coverage gap that should block ship?
3. Anything stylistically off from the project's vitest patterns
   (compare with `enqueue-job-v6.test.ts` and `thinking-defaults.test.ts`
   in the same dir)?
4. Is the env-var save/restore in `beforeEach`/`afterEach` correct,
   or does it leak across tests?
5. Any flaw in the design that the prior 4 fan-out rounds missed?

## Where to write your response

- copilot → `/Users/rd/ollama-claude/.claude/brainstorm/h-diff-review-copilot.md`
- gem     → `/Users/rd/ollama-claude/.claude/brainstorm/h-diff-review-gem.md`
- nv_pro voices → stdout (will be captured)

Output: review body only — no preamble, no meta.
