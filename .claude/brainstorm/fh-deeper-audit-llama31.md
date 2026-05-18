I strongly believe that the framing of the F+H+G plan has a flaw that needs to be addressed. Specifically, I think that F is redundant and does not add significant value to the testing process. 

H already verifies the boundary signal (`disableThinking` flag flows correctly from `THINKING_DEFAULTS` registry → backend chat options), and G (dogfood) catches model regressions, which is the primary concern of F. The MODEL hasn't changed in v0.6.0, and only the THINKING MODE wiring changed. Therefore, F mainly catches MODEL regressions, which dogfood (G) catches too.

While F might catch some classes of bugs that boundary-only H + behavioural G might miss, I think the cost of maintaining F outweighs its benefits. F adds ~80 LOC, introduces a new gate that can become flaky, and does not provide significant additional value.

Regarding the threshold, I think Claude's compromise of 0.90/0.75 is not defensible. The team did not agree on this threshold, and there is no principled reason for this exact split. I think we should revisit the threshold per-fixture or per-tier (not global) to make it more meaningful and effective.

As for the runner's 25-inference JSONL, I think we should discard it. The data was produced by a methodology (Phase 1 rerun) that the project has now rejected, and committing it would only add noise to the repository.

My concrete recommendation is:

**(a) Skip F entirely. Ship v0.6.0 with H + G only. Add F in v0.6.1 if dogfood surfaces a regression.**

Discard the runner JSONL to avoid confusion and keep the repository clean.
