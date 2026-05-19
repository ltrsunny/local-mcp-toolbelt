Reading the project's brief to extract required actions and identify the top structural problems (best next step to fulfill the brief). Running a parallel intent report and file read.

● Read project-health-review-brief-2026-05-18.md
  │ .claude/brainstorm/project-health-review-brief-2026-05-18.md
  └ 92 lines read

1) Duplicate install surface — v0.7’s omcp install is reinventing Gemini’s hook/skill UX (gemini hooks migrate, gemini skills install). Remediation: stop reimplementing; deliver a thin adapter that delegates to gemini and documents when to extend.

2) Fragile runtime lifecycle coupling — relying solely on oMLX via brew-services is brittle now that gemini offers Gemma lifecycle (gemini gemma start/stop). Remediation: add a pluggable BackendManager and a Gemma adapter + CI matrix.

3) Policy/format mismatch — gemini’s -o json/Policy Engine and Copilot’s --acp break our human-text fan-out. Remediation: require and implement machine-readable JSON outputs and policy flags in fan-out scripts; fail fast on noncompliance.

4) Smoke ≠ real protocol bug — seed-oss silent drops mean smoke pings are misleading. Remediation: quarantine failing models, add real-workload health checks, and triage fixes tomorrow.



Changes   +0 -0
Requests  1 Premium (23s)
Tokens    ↑ 39.4k • ↓ 1.7k • 21.8k (cached) • 1.3k (reasoning)
