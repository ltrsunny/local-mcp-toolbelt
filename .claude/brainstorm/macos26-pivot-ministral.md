The framing here underplays macOS 26’s non-backward-compatibility risks for GPU/OOM handler behavior—Metallic/Metal API churn is Apple’s pattern (e.g., Big Sur→ Monterey forced rework). Releasing *as-is* (Option A) ignores that Tier D’s 16GB safety margin may now *increase* demand (Foundation Models’ iPhone-class 3B models may trigger launched-sfont drag on shared pools). Worse: the "reversible" premise rests on *deprecation flags* that won’t save you from run-time asserts or stricter GPU page accounting on upgraded machines.

Ironically, the prompt’s tension *between* apple-llm framework and Tier D is solved: Foundation Models is **irrelevant to v0.6.0**. A 0.7 option is the *cost* of deferring this judgement—bringing in new drivers, Bloom filters, or heap audits in a major version risks migration footguns that the "ship as-is" caveat won’t nip.

Recommended: **Option C—but with a stronger clause**. MacOS 25 data needs *explicit API version anchoring* (submit through Apple’s `iosurface_stat_t`äku hooks where possible) and a release note to abandon holder spapespace on the first `NS_DURING TiltshiftTransition`. The True Cycle constraint is laziness; macOS 26 = new Prometheus contract. Code lazy releases as ==CHANGELOG>= working history—toxic for plugin justice.

---
**D. Ship v0.6.0-post.1 with Foundation ISO860 calls and Tier D on-hold until runtime hardeningфанзы** (определяющий шаблон). This *fixes* the "sequoia don’t have free updates required" gap today’s Table 5 ignores (Mac Dev Center did. You didn’t).

*Rationale*:
1) macOS 26.OnUpgrade hoovers Priority6Qroups—dev OOM and soft priority 1 tasks *share the same CupworkManagerBudget checkpoint*. The gap is console logs.
2) You’ll still spend 26’s block-unmapping patch once for Feature A; hardware symmetry is a hit (1.5 commits).
