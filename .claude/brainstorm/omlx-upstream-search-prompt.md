RESEARCH TASK — check oMLX upstream for known reports / existing fix of a crash we observed.

REPO: https://github.com/jundot/omlx
OUR INSTALLED VERSION: 0.3.8 (built from source 2026-05-07)
TAP HEAD: 32 minutes newer than our 0.3.8 build (commit a7b2082...)

OBSERVED BUG (twice on same machine, 16 hours apart):
oMLX Python (3.11) process crashes with SIGABRT. Faulting thread stack:
```
mlx::core::gpu::check_error(MTL::CommandBuffer*)  ← throws
  __cxa_throw → std::__terminate → abort()
```
No catch handler in oMLX's Python wrapper around the MLX Metal-command-buffer
completion callback path. Trigger amplified by:
- hot_cache_max_size at 10GB on a 16GB Mac (memory pressure)
- fast tier alternation (4B → 8B → 14B in same minute)
- Tier D (Qwen3-14B-4bit) loading under memory pressure

FIND THE FOLLOWING — use `gh` CLI (you have it):

## 1. Existing issue reports

`gh issue list --repo jundot/omlx --state all --limit 100` and search for any of:
- "SIGABRT" / "abort" / "crash" / "terminated"
- "check_error" / "MTL::CommandBuffer" / "Metal error"
- "command buffer" / "uncaught exception"
- "hot_cache" + crash combinations

For each match: URL, title, open/closed, date, 1-line summary, whether it
matches our Metal-completion-handler exception stack.

## 2. Existing fix in commit history

`gh search commits --repo jundot/omlx --limit 50` for commits touching:
- "exception" / "try" / "catch" / "abort"
- "check_error" / "command_buffer" / "completion_handler"
- "metal" backend / GPU error path

Also check `gh search code --repo jundot/omlx 'check_error'` to see whether
the function call path has been wrapped.

For each candidate fix: commit SHA, date, title, which files, whether it's
on a release branch (0.3.9+) or still on main only.

## 3. Release activity since 0.3.8 (2026-05-07)

`gh release list --repo jundot/omlx --limit 10`
`gh api repos/jundot/omlx/milestones?state=open`

Is 0.3.9 imminent? What's planned?

## 4. Any related upstream MLX issue (mlx-explore/mlx)?

If our problem traces to MLX framework (not oMLX wrapper), search:
`gh issue list --repo ml-explore/mlx --search "check_error abort"`
(or whatever the upstream MLX repo path is — discover it from oMLX dependencies)

## Output format

Write directly to: `/Users/rd/ollama-claude/.claude/brainstorm/omlx-upstream-search.md`

Sections:
- **Existing issue reports** (matches / partial matches / "none found")
- **Existing fixes in commit history** (with version targeting)
- **0.3.9 status**
- **MLX framework issue** (if you find oMLX punts to MLX)
- **Recommendation**: do we (a) wait for upstream, (b) upgrade to HEAD now,
  (c) pin to older oMLX 0.3.7 if it was more stable, or (d) file a new issue?

Be efficient. ~5-10 minute time budget. No preamble, no marketing.
Use `--json` output from gh where possible.

Use --yolo (NOT --allow-all-tools alone; the latter hangs in -p mode
on copilot 1.0.44 because it can't auto-approve file-path / URL access).
--effort xhigh.
