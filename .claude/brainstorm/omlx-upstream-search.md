# oMLX upstream search — known reports / existing fixes for our crash

**Date:** 2026-05-11
**Target:** jundot/omlx (13.4K stars, public, Apache-2.0)
**Method:** manual `gh` queries (copilot agentic attempt got stuck on a
permission loop and was stopped; raw log kept at
`.claude/brainstorm/omlx-upstream-search-raw.log`)

## TL;DR

Our oMLX is **v0.3.8** (built 2026-04-30). Since then, three upstream PRs
have landed that plausibly bear on our SIGABRT pattern:

- **#1126 — OOM guard** (merged 2026-05-09, in v0.3.9.dev1)
- **#1146 — async_eval for cache-store** (merged 2026-05-11, on main only)
- **#1101 — hot cache shutdown flush** (merged 2026-05-11, on main only)

No explicit "wrap `mlx::core::gpu::check_error` in try/catch" PR was found
in the visible history. Our crash mode (uncaught C++ exception from MLX
Metal completion handler) may not yet be reported as a distinct issue
upstream — it would be a candidate for a new bug report, but two of the
three above PRs are plausible *indirect* fixes (they reduce the conditions
under which `check_error` actually throws).

## Releases

```
v0.3.9.dev1   2026-05-06   Pre-release  ← contains #1126
v0.3.8        2026-04-30   Latest stable ← what we have installed
v0.3.7        2026-04-28
v0.3.6        2026-04-16
```

v0.3.9.dev1 highlights (verbatim relevant fix lines):

- "Periodic `mx.clear_cache` during long decodes: gated on accumulated
  buffer bytes so it only fires when there's something to free…"
- "Async store path: drop worker-thread `mx.eval` calls in `store_cache`;
  defer boundary-snapshot cleanup until the async store finishes; bypass
  continuity check for blocks with a boundary snapshot."

Both touch the exact subsystem (async Metal eval + cache store) that
shows up in our faulting thread.

## Most relevant PRs

### PR #1126 — `feat(oq): on-the-fly FP8/I8 dequant + OOM guard`

- Merged 2026-05-09. In v0.3.9.dev1. URL: jundot/omlx#1126
- Body excerpt: *"OOM guard: When model size exceeds 80% of system RAM,
  skips eager sanitize fallback (with error-level logging) and sensitivity
  measurement."*
- Why relevant: Our 14B-4bit (~7-8 GB) + 10GB hot_cache + system on 16 GB
  Mac trips the 80% threshold. Without this guard, the eager-sanitize
  fallback runs and can fail on a Metal allocation, hitting `check_error`.

### PR #1146 — `fix(scheduler): use async_eval for cache-store materialization`

- Merged 2026-05-11 (today). **Not in v0.3.9.dev1.** URL: jundot/omlx#1146
- Body excerpt: replaces `mx.eval(*pre_eval_arrays)` with
  `mx.async_eval(...)` inside `_cleanup_finished`. Worker thread now does
  its own `mx.synchronize()`.
- Why relevant: Our crash trace bottoms out in
  `mlx::core::gpu::check_error(MTL::CommandBuffer*)` inside a Metal
  completion handler. The PR description specifically talks about the
  inference thread blocking on `mx.eval` while the cache-store worker
  uses the arrays. Under memory pressure, the dual-thread MLX flow can
  produce a Metal command-buffer error — exactly our symptom.

### PR #1101 — `fix(cache): use blocking put during shutdown flush`

- Merged 2026-05-11 (today). **Not in v0.3.9.dev1.** URL: jundot/omlx#1101
- Why relevant (weaker link): we restart oMLX several times when iterating
  on `hot_cache_max_size`. The pre-fix shutdown silently drops up to half
  the hot-cache blocks, which is at least a correctness loss adjacent to
  our crash window.

## Recent commits on main (since v0.3.9.dev1)

```
a7b2082  2026-05-11  observability(speculative): log per-request vlm_mtp acceptance stats
7ec3df5  2026-05-11  perf(speculative): serialize concurrent vlm_mtp via BG fallback
5c6e83e  2026-05-11  feat(speculative): wire vlm_mtp decode path (phase 2B)
79176ff  2026-05-11  fix(deps): move python-multipart to main dependencies
4e12c82  2026-05-11  fix(omlx_app): honor bind host in update_model_dir_runtime
c087923  2026-05-11  fix(scheduler): use async_eval for cache-store materialization (#1146) ★
a5043ac  2026-05-11  fix(cache): flush hot cache blocks to SSD on shutdown without dropping (#1101) ★
1b7c1b0  2026-05-09  feat(oq): on-the-fly FP8/I8 dequant in _LazyTensorIndex + OOM guard (#1126) ★
```

The HEAD `a7b2082` is what `brew install --HEAD` would deliver.

## Issue search

`gh search issues 'repo:jundot/omlx ...'` failed with parser errors on
each multi-keyword query I tried; the search API translates the query in a
way that breaks the JSON output. Falling back to `gh issue list` would
work but returns 500+ items and would need local grep — not done in this
pass. Net: I have NOT confirmed whether anyone has reported our exact
`check_error` SIGABRT stack to the issue tracker.

This is the strongest gap in this PA — recommend doing a focused
`gh issue list --repo jundot/omlx --state all --limit 100 --json
number,title,body | grep -i "check_error\|SIGABRT"` before filing.

## Upstream MLX (`ml-explore/mlx`)?

Not searched in this pass. The exception originates in MLX's own
`check_error`, so the *true* root cause might be in `ml-explore/mlx`'s
Metal command-buffer error handling, with oMLX merely failing to install
a `catch`. A follow-up PA candidate would search ml-explore/mlx for
`check_error abort` / `MTL::CommandBuffer error`.

## Recommendation

Given:
- We are in **stop-the-line** stance after two SIGABRT crashes
- We already rolled back `hot_cache_max_size` to 6GB
- Phase 1 eval + 3rd PA candidate are deferred until stability returns
- Two relevant fixes (#1126 + #1146) are NOT in our build but ARE upstream

### Preferred path: upgrade to v0.3.9.dev1 stable-track

```bash
# Take a snapshot first
cp ~/.omlx/settings.json ~/.omlx/settings.json.pre-0.3.9-dev1
brew services stop jundot/omlx/omlx
brew uninstall jundot/omlx/omlx
brew install --HEAD jundot/omlx/omlx     # gets HEAD, which has all 3 PRs
# or, to stay on the dev1 tag:
# brew install jundot/omlx/omlx@0.3.9.dev1  (if a versioned formula exists)
brew services start jundot/omlx/omlx
curl -s localhost:8000/v1/models | jq -r '.data[].id'   # smoke
```

Then run the same 3-call 14B smoke test we did earlier. If stable:
- Stay on it; revisit hot_cache budget cautiously (don't jump back to 10GB)
- Update CLAUDE.md with the new oMLX version
- Update stability note to reflect resolution

### Fallback: pin to v0.3.7 + file new issue

If upgrade is unstable, downgrade to v0.3.7 (the last before 0.3.8's
release window) and file an oMLX upstream issue with our two crash
reports attached. Draft already at
`.claude/diagnostics/upstream-bug-report.md`.

### Either way: also file the issue

Even if upgrade resolves it, the `check_error` exception-handling path
is still an unprotected abort surface upstream. Filing the report (with
crash IPS dump excerpts) gives the maintainer the data to add a
`try { } catch (...) { }` even if our specific symptom no longer recurs.

## Status

- Manual `gh` queries: complete
- Copilot agentic attempt: aborted (Permission denied loop), see raw log
- Decision pending from user (per stop-the-line discipline): which path?
