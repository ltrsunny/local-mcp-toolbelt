Reading the brief file to extract the requested F/H design choices and any framing issues. Using view to load the brief; reporting intent "Reading brief" alongside the file read.

● Read fh-impl-design-brief-2026-05-15.md
  │ .claude/brainstorm/fh-impl-design-brief-2026-05-15.md
  └ 103 lines read

F — implement a new programmatic scorer at packages/core/tests/eval/scorer.mjs (option a). API: export async scoreRun(runPath) which reads packages/core/tests/eval/runs/*.jsonl and emits per-row {pass:boolean, score:0..1, details} + summary JSON. Rules: classify → canonicalize labels then unordered-equality; if allow_multiple use Jaccard/F1 with threshold 0.8; ignore `reason`. extract → field-by-field, type-aware tolerance (numbers ε=1e-6, strings trimmed/case-insensitive), fallback to schema-validity-only. Add canonicalizeOutput() helper.

Gate: require mean(score) ≥ 0.95 and no trial < 0.90.

H — add tests/unit/thinking-mode-behavioural.test.ts. Mock/spyon MlxHttpBackend.chat (RecorderBackend) and parameterize three assertions: summarize* tools assert outgoing chatOptions.disableThinking === true; classify/extract assert disableThinking === false. Use src/config/thinking-defaults.ts for the registry and assert parity. Tests verify the boundary signal only (real oMLX behavioural check left to dogfood/G).

Pushback: cannot validate real reasoning traces in CI — scorer must canonicalize noisy outputs; gating thresholds chosen to balance stochasticity and safety.

Recommendation: land scorer.mjs + the three behavioural tests, gate on mean ≥0.95 & per-trial ≥0.90.


Changes   +0 -0
Requests  1 Premium (38s)
Tokens    ↑ 39.3k • ↓ 2.4k • 5.1k (cached) • 1.9k (reasoning)
