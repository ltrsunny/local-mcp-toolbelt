# Brief: Tier D demotion in CLAUDE.md tier table — what shape?

You are a senior engineer reviewing a release-prep decision in
`local-mcp-toolbelt` v0.6.0. Output 250-400 words. End with one
explicit recommendation (from A-E or propose F). No preamble.

## Context

`local-mcp-toolbelt` ships an MCP bridge that delegates summarize /
classify / extract / transform to a local Qwen3 model on oMLX (an
MLX-based inference server). 16 GB Mac is the development hardware
and the published-target hardware. The current CLAUDE.md tier table:

| Tier | Model | numCtx | Status |
|------|-------|--------|--------|
| B    | Qwen3-4B-Instruct-2507-4bit | 8192  | default short tasks |
| C    | Qwen3-8B-4bit               | 32768 | long-form summarize |
| D    | Qwen3-14B-4bit              | 16384 | opt-in classify + transform; toolTierMap override required |

## Observed reality this session (2026-05-15)

1. **Metal OOM crashes**: oMLX aborted today at 11:43 with
   `[METAL] Command buffer execution failed: Insufficient Memory
   (00000008:kIOGPUCommandBufferCallbackErrorOutOfMemory)`. Trigger
   was a 12 KB bridge `extract` call on Tier B (4B). NOT Tier D —
   but the IOGPU layer hit GPU-side allocation failure with model
   alone in cache. With 14B (Tier D) loaded, the residual GPU
   budget for command buffers is tighter.

2. **hot_cache_max_size = 6 GB** in `~/.omlx/settings.json` (lowered
   from 10 GB in v0.5.1 after stability work). 14B at 4-bit alone
   is ~7-8 GB; doesn't fit alongside another tier hot.

3. **60 s MCP wall**: v0.6.0 async-triad lets large work escape this
   via background jobs, but for sync direct calls, Tier D's warm
   decode at ~30 tok/s + prefill on 7K-token inputs reliably
   approaches 50-60 s. The "classify + transform short cases"
   benefit from D's accuracy lift but the latency margin is thin.

4. **No Tier D eval data committed in v0.6.0** (Phase 1 rerun was
   rejected as a category error — runs/ JSONL gitignored). The
   v0.5.1 baseline reported 3/3 tiers FAIL ≥ 4.0/5 mean.

## The demotion question

Five plausible shapes of "demote Tier D":

- **A. Remove Tier D from CLAUDE.md tier table entirely.** It exists
  in code (toolTierMap allows opt-in) but is no longer documented
  as a routing option.
- **B. Strengthen caveat in place.** Keep the row, but change Status
  to "16 GB Mac: NOT recommended. Use only if you've raised
  `hot_cache_max_size` and accepted longer wall times."
- **C. Drop 14B model from the default download (`npm run
  download-models`) and mark Tier D as "manual install + opt-in"**.
  Reduces footprint for new users.
- **D. Route classify + transform back to Tier B/C default**, leaving
  Tier D's `toolTierMap` override mechanism but with no documented
  "validated" use case.
- **E. Combine B + D: tier table caveats Tier D AND routing defaults
  no longer point at it.**

## The actual judgment to make

What's the principled shape of demotion given:
- v0.5.0 introduced Tier D after eval data suggested ~+0.5 score
  lift on classify + transform short cases.
- v0.5.1 stability work tightened hot_cache to 6 GB, making
  D + warmer-tier coexistence impossible.
- 16 GB Mac is target hardware; 24/32 GB users exist but aren't
  primary.
- v0.6.0 plumbing changes don't directly affect Tier D's behaviour
  but the new async triad reduces the 60 s wall pressure for the
  USE CASE that justified D.
- No 2026-05-15 Tier D eval data exists to support OR refute the
  v0.5.0 thesis.

## Your task

Pick ONE option (A/B/C/D/E or propose F). Push back if the framing
is wrong. Output: comment body only, no preamble, no meta.
