● Read eval-frame-debate-brief-2026-05-15.md
  │ .claude/brainstorm/eval-frame-debate-brief-2026-05-15.md
  └ 95 lines read

The current framing — “v0.6.0 must rerun Phase 1 with LLM-as-judge and meet a ≥4.0/5 mean” — collapses two orthogonal risks: (1) behavioural regressions introduced by thinking-mode defaults and schema changes, and (2) methodological instability from relying on LLM-as-judge against an ill-calibrated baseline. The baseline itself (v0.5.1 reporting 3/3 tiers FAIL) suggests the Phase‑1 harness or bar is miscalibrated; repeating the same protocol will only reproduce high-variance, low-signal outcomes. LLM-as-judge is attractive for scale, but it amplifies systemic biases (in‑family scoring, judge-model drift) and conflates “is the test harness working” with “is the product acceptable.”

Key pushes:
- Assumption 1 (must rerun): reject as a default. v0.6.0’s changes are mostly protocol/flag and thinking-mode defaults; most are already covered by unit tests and integration dogfooding. A full re-run of Phase 1 is disproportionate unless scope included large model/architecture changes.
- Assumption 2 (Phase 1 design is still fit): challenge the statistical design: 5 fixtures × 5 trials with an LLM judge produces noisy means sensitive to judge choice and baseline drift. It’s not the right oracle for behavioural defaults.
- Assumption 3 (comparability to v0.5.1): unreliable. Use of an unstable baseline as the success anchor is a category error; better to measure delta against programmatic gold where possible, and to measure targeted behavioural assertions for thinking-mode changes.
- Assumption 4 (LLM-as-judge required): false for structured outputs (classify/extract). Programmatic exact/lenient matching yields objective, low-noise signals.

Practical, budget-aware alternative gate (minimal, high-signal):
1) Automated programmatic validation for structured tools: run full gold-match on classify/extract across canonical fixtures; require 100% pass on critical fields or defined tolerance bands. 2) Behavioural unit/integration assertions: add 2–4 tests that encode the new thinking defaults (e.g., “summarize-long with thinking=off must not emit <think> tokens; classify with thinking=on must include a reasoning field”), and require green. 3) Prose spot-check: human or out‑of‑family judge (20–30 samples across summarize-long and transform) reviewed by an engineer + a single gem/nv_pro pass if available—spot checks beat noisy full LLM-judge runs. 4) 7‑day dogfood window with a release-blocker for any user-facing regression.

This preserves rigor (objective programmatic checks + targeted human verification) while avoiding methodological downgrade to unstable LLM-as-judge means. Recommendation: Ship v0.6.0 without a full Phase‑1 LLM-as-judge rerun; require (a) programmatic gold-match for classify/extract, (b) two new behavioural unit tests for thinking-mode defaults, (c) a 20–30 sample human/gem spot-check for prose tasks, and (d) a 7‑day dogfood window with a release-blocker for any production-quality regression.


Changes   +0 -0
Requests  1 Premium (29s)
Tokens    ↑ 39.2k • ↓ 2.2k • 36.9k (cached) • 1.3k (reasoning)
