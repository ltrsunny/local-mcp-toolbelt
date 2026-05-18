Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
The framing of this decision as a mere "demotion" understates the structural reality of the v0.6.0 environment. If our published-target hardware is a 16 GB Mac, and we have deliberately hardcoded `hot_cache_max_size = 6 GB` to mitigate severe IOGPU memory exhaustion, then an 8 GB 14B model is no longer just "not recommended"—it is fundamentally incompatible with a stable, multi-tenant baseline. We are already seeing OOM crashes on the 4B model; keeping a 14B model in the active rotation guarantees catastrophic cache thrashing or immediate Metal crashes for our primary demographic.

The empirical justification for Tier D (a +0.5 score lift on short cases during v0.5.0) has been eclipsed by the mechanical realities of the system. Furthermore, the architectural shift to the async triad in v0.6.0 fundamentally changes the latency math. By allowing heavy work to escape to background jobs, the 60-second synchronous wall pressure is relieved, eroding the secondary justification for relying on Tier D for critical path tasks. Since we have no fresh eval data for 2026-05-15, we cannot justify keeping a broken configuration on the hope of a scoring advantage that we can't currently prove.

Shipping a massive 8 GB asset that actively degrades system stability out-of-the-box is a hostile user experience. We must align the shipped product with the physical constraints of the target hardware.

I propose **Option F (A strict superset of A, C, and D)**:

1. **Drop the 14B model from the default download script (`npm run download-models`)**: We must immediately stop spending the user's bandwidth and disk space on a model they cannot reliably load within the 6 GB cache limit.
2. **Remove Tier D from the `CLAUDE.md` tier table entirely**: Do not present it as a standard or even "caveated" option. Documenting it signals to 16 GB users that they are missing out on an officially supported feature, inviting misconfiguration, manual cache overriding, and inevitable support churn.
3. **Route all classify and transform defaults back to Tier B or Tier C**: Ensure absolutely no out-of-the-box routing logic requests Tier D.

The `toolTierMap` override can remain in the codebase as a completely undocumented, unsupported escape hatch for 24/32 GB power users who wish to manually provision the weights. But for the v0.6.0 release, Tier D must effectively cease to exist in the public-facing product.

**Recommendation:** Option F (Drop from downloads, remove from CLAUDE.md, and reset all routing defaults to Tier B/C).
