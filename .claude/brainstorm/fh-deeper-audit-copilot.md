Opening the brief to read its instructions so the response can follow them exactly; will read the file and produce a concrete comment body per the brief. Calling tools to report intent and view the brief.

● Read fh-deeper-audit-brief-2026-05-15.md
  │ .claude/brainstorm/fh-deeper-audit-brief-2026-05-15.md
  └ 82 lines read

The F+H+G framing is useful, but Claude’s unilateral choices require correction before landing.

Short analysis
- Redundancy: H (boundary propagation unit tests) ensures wiring is correct; G (dogfood) exercises end-to-end behaviour over time. F’s unique value is targeted regression detection where structural output expectations can catch routing or tier-selection bugs that H and G may miss. That makes F potentially valuable, but only if it’s precise and low-maintenance.
- Thresholding: “mean ≥ 0.90 AND no trial < 0.75” is an unaudited compromise. Thresholds must be defensible from data — not a split-the-difference hack. Different fixtures and tiers have different signal/noise; a one-size global gate invites both false positives and brittle failures.
- JSONL artifact: committing the 25-run JSONL into source will confuse future readers and inflate the repo for marginal value. It’s useful for traceability but not as a committed gating artifact.

Concrete proposal
- Keep F, but implement it as per-fixture/per-tier checks (option c). For each fixture/tier derive thresholds from a short baseline study: collect N baseline runs (e.g., 3–5 CI baselines) and set two checks: (1) a mean threshold = baseline_mean − delta (delta = e.g., 2*baseline_std or a conservative absolute margin like 0.05), and (2) a percentile floor (e.g., 10th percentile ≥ X) to catch outliers. Record thresholds alongside fixtures in tests/eval/scorer.mjs so they’re reviewable.
- Make F non-blocking by default in CI for patch releases (warn on fail) and blocking for release candidates only. That reduces flakiness risk.
- Keep H as strict unit tests for disableThinking propagation and continue G dogfood window.

Artifact handling
- Do NOT commit the 25-inference JSONL to git. Upload it as a CI build artifact or attach it to the release notes (or store under an internal artifact bucket) with a clear README explaining methodology and non-gating status.

Recommendation: (c) Keep F but use per-fixture/per-tier, data-derived thresholds; do NOT commit the 25-inference JSONL to the repo—store it as a CI artifact/release attachment.


Changes   +0 -0
Requests  1 Premium (30s)
Tokens    ↑ 39.3k • ↓ 2.3k • 21.9k (cached) • 1.7k (reasoning)
