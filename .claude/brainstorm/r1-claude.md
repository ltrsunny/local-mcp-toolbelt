# R1 — Claude (claude-opus-4-7)

## Proposal C1: Bypass MCP for result delivery — use the filesystem

`enqueue-job` returns `{job_id, result_path: "~/.local-mcp/jobs/<id>.json"}`
immediately. Bridge runs the work in a persistent daemon and writes the
result via atomic rename (`<id>.tmp` → `<id>.json`). Claude does NOT call
`wait_for_job` at all — it uses its own `Read` tool against `result_path`.
Read fails with ENOENT until the file exists; Claude can sleep/retry between
Read attempts (each Read is instant, no 60s wall). Removes the poll loop
inside MCP entirely; the 60s wall now only constrains submission, never
work duration.

- **Assumption**: Claude's Read tool can hit the bridge's job dir (it can —
  ~/.local-mcp is already addressable via file://).
- **Failure mode**: Claude reads before write completes. Mitigated by atomic
  rename — partial files are never named `<id>.json`.
- **Cost**: M. Existing async-job infra mostly applies; delete wait_for_job,
  keep job worker, document the Read-based completion check.

## Proposal C2: Decompose-at-API-boundary (per-tool chunk variants)

Instead of one big `summarize-long-chunked` that internally fans out and
reduces, expose primitive tools: `chunk-summarize(text, idx)`,
`chunk-reduce(summaries)`. Each call is sized to fit in <30s wall. Claude
orchestrates the map-reduce by chaining ~N+1 tool calls. Final result
comes back via the last reduce call (which fits 60s because input is
already small summaries).

- **Assumption**: Tasks are decomposable into ≤30s units. Claude is willing
  to spend N tool calls instead of 1.
- **Failure mode**: Monolithic tasks have no chunk boundary (e.g., 14B
  classify on big input — no natural split). Doesn't help those.
- **Cost**: L. New tool surface area, state passing in args, doc burden.

## Proposal C3: Result hash + idempotent re-submit

`enqueue-job(args)` hashes args → deterministic job_id. Every call returns
one of: `{status: 'done', result}`, `{status: 'pending', eta_ms}`, or
`{status: 'queued'}`. No `wait_for_job` — Claude re-calls `enqueue-job`
with same args; if already done, instant return; if still pending, sleep
the suggested eta and retry. Bridge dedups concurrent identical calls.

- **Assumption**: Result cache + GC discipline. Re-call cost is acceptable.
- **Failure mode**: ETA estimates are wrong; Claude either burns calls
  retrying too eagerly or waits too long.
- **Cost**: M. Most of enqueue-job machinery already exists.

## Ranking

**C1 > C3 > C2.**

C1 is structurally elegant — it eliminates the 60s wall from the *work
path* entirely by moving result delivery off MCP. C3 is just a more
disciplined version of the existing async-job; useful refinement but not
a structural shift. C2 is the most invasive and least general — only helps
decomposable tasks.

The insight in C1: **`wait_for_job` is the bug**, not a feature. Bridge
already has persistent job files; Claude already has `Read`. Use both.
MCP becomes the *submit* channel; filesystem is the *return* channel.
