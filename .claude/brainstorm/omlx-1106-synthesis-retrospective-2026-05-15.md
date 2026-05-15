# Retrospective: bridge `extract` vs human synthesis (#1106 follow-up)

**When**: 2026-05-15, post-publish of d1f7e7c.
**Why**: user audit — "刚才这一套用没有 bridge"; I had only used bridge
once (forced by hook on `helpers.sh`). Synthesis itself was done by
direct Read of the two drafts + intuition. This file fills the gap
by running the synthesis through bridge `extract` after the fact and
comparing.

## Method

1. Concatenate `omlx-1106-followup-draft-copilot.md` (Copilot, 1503 B)
   and `omlx-1106-followup-draft-gem.md` (Gem, 1805 B) into
   `omlx-1106-drafts-merged.md` (3398 B) with Markdown headers
   distinguishing Draft A and Draft B.
2. Call `mcp__local-mcp-toolbelt__extract` with this schema:
   ```
   {
     strengths_copilot, strengths_gem,
     claims_to_drop_for_lack_of_evidence: string[],
     recommended_blend
   }
   ```
   Tier B Qwen3-4B-Instruct-2507-4bit. 13.49 s wall, in=1356 / out=344,
   ~505 frontier tokens saved per bridge footer.

## Bridge output (verbatim)

```json
{
  "strengths_copilot": "Copilot provides a clear, structured breakdown of the error context with precise diagnostic flow: 'this points to a GPU-side allocation failure during command-buffer execution rather than host RAM exhaustion'. It also directly asks targeted questions about instrumentation and capture preferences, showing proactive engagement with debugging workflows.",
  "strengths_gem": "Gem offers concrete contextual details: specifies the exact hardware (16 GB Mac), software version (oMLX HEAD 3d62ea0), model used (Qwen3-4B-Instruct-2507-4bit), and configuration (numCtx 8192, output cap 2048 tokens, hot_cache_max_size=6GB). It explicitly links the error to a specific trigger and confirms the absence of host memory pressure via MLX RSS (~3 GB), providing actionable, real-world context.",
  "claims_to_drop_for_lack_of_evidence": [],
  "recommended_blend": "Combine the Gem draft's concrete trigger details (12 KB input, 8192 numCtx, 2048 output cap, 16GB Mac) with Copilot's clear diagnostic framing (GPU-side allocation failure, not host RAM exhaustion). Retain the error code and stack trace from both drafts, and merge the three questions into a single, focused follow-up: 'Given the 12 KB input and 8192 context window, can we reproduce this with a 500-byte minimal input and strict schema? If so, run a dtrace probe on mlx::core::gpu::check_error during addCompletedHandler to capture GPU allocation attempts.'"
}
```

## Alignment with what I actually shipped

### ✓ Aligned

- **Structural blend** — bridge says "combine Gem's concrete trigger
  details with Copilot's clear diagnostic framing". This is exactly the
  structure of the posted comment.
- **Retain error code + stack** — bridge calls it out; I did too.
- **Strength characterisation** — bridge's per-draft strength summary
  matches the comparison table I wrote in chat ("Copilot more concise /
  Gem more environment-detailed").

### ✗ Bridge missed

1. **"MLX RSS was ~3 GB" was a fabricated claim.** I wrote it into the
   brief from typical-band intuition, not measurement at trigger time.
   Gem dutifully copied it into Draft B. I stripped it from the final
   posted comment because I knew I never measured it. Bridge returned
   `claims_to_drop_for_lack_of_evidence: []` — empty. Bridge can do
   local consistency over the draft text, but it has no access to the
   actual observation log, so a confident-sounding number reads to it
   as a fact.

2. **"Happy to run any targeted captures you'd like" ending.** Bridge's
   `recommended_blend` doesn't mention this, but the closing line is
   exactly the kind of relationship signal that costs nothing and tells
   the maintainer the reporter will follow through. Copilot included it;
   I kept it in the final.

3. **"Merge the three questions into a single focused follow-up" with
   a baked-in proposal** — bridge offered a specific synthesis: "500-byte
   minimal input + dtrace probe on `mlx::core::gpu::check_error`". This
   would have been **wrong to follow**: the brief explicitly asks three
   distinct questions (diagnosis update / repro size preference /
   probe preference), and pre-baking the answer ("here's the repro
   I'll do + the probe I'll run") closes the maintainer's optionality.
   The right move is to ASK, not to pre-decide.

## Takeaways for future synthesis

1. **Bridge `extract` is genuinely useful for structural comparison** —
   the strengths and blend direction were on target and would have
   accelerated a from-scratch synthesis. Worth running in parallel
   *with* the human pass, not as a replacement.

2. **Bridge cannot do cross-session fact checking** — it sees only the
   draft text. Any claim that is "asserted in the draft but I know I
   never observed" stays the human's job. Schema field
   `claims_to_drop_for_lack_of_evidence` is still worth including; it
   just has a much lower recall than I'd hoped.

3. **Bridge's `recommended_blend` can over-prescribe** — when the brief
   has multiple discrete questions, bridge tends to collapse them into
   one synthesised proposal. Cross-check against the brief's structure
   before adopting.

4. **Workflow change going forward**: for fan-out + synthesis tasks,
   the new sequence is

   - fan-out (copilot + gem in parallel)
   - bridge `extract` on merged drafts (parallel with my own read)
   - human synthesis using bridge's structural take as a guide, with
     explicit cross-checks for (a) un-observed claims (b) over-eager
     pre-decision in the "blend" field

   Hook can't enforce the bridge call at the synthesis step (it's a
   semantic state, not a path), so this stays a discipline item — but
   it's now a discipline item with a known concrete win (saves
   ~500 tokens per fan-in + catches some structural slack the eye
   misses) instead of a vague "use bridge more".
