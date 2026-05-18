Reading the brief file to extract instructions and options (A–E) and choose the best one with justification. Running view on the brief and reporting intent in parallel.

● Read tier-d-demotion-brief-2026-05-15.md
  │ .claude/brainstorm/tier-d-demotion-brief-2026-05-15.md
  └ 81 lines read

The current evidence argues for a conservative, user-protecting demotion: combine a stronger caveat in the tier table with routing defaults that avoid Tier D for classify/transform. Rationale: (1) Stability risk is real — a 4B-tier extract already triggered a Metal OOM while the 14B model’s resident footprint (~7–8 GB) + hot_cache (6 GB) makes co-residency unlikely on a 16 GB Mac. (2) No committed Tier D eval artifacts exist for v0.6.0 to substantiate the claimed accuracy/utility gains; trusting an unverified + fragile path risks regressions for the default user. (3) The new async/background triad and existing B/C offerings already let heavier work escape the 60 s sync constraint where Tier D was most useful, reducing the operational need to push users into D by default.

Operationally, choose the hybrid: update CLAUDE.md to mark Tier D with a strong “NOT recommended on 16 GB: opt-in only, requires manual install and increased hot_cache” language; simultaneously change routing defaults so classify+transform map to B/C unless an explicit per-user toolTierMap opt-in selects D. This preserves the opt-in path for advanced users and experimentation while protecting most users and automated workflows.

Next steps (implementation-minded, short): (a) amend CLAUDE.md row text and add a prominent note in download docs; (b) change default toolTierMap to point classify/transform at B/C; (c) remove 14B from automatic downloads or mark as manual install (low friction: present a clear npm script flag); (d) commit an eval-run plan + reproducible JSONL and re-run Tier D validation before any future “re-promotion”; (e) add a small OOM-detection telemetry/test in CI to flag regressions.

This balances safety, discoverability, and the ability to re-evaluate Tier D once objective eval data and/or higher-memory hardware become the default. Recommendation: E.


Changes   +0 -0
Requests  1 Premium (31s)
Tokens    ↑ 39.3k • ↓ 1.6k • 20.7k (cached) • 960 (reasoning)
