# Brief: should the hook gate scope memos? (revert `f8a8fc1` or not)

You are a senior architect reviewing a small design decision in
`local-mcp-toolbelt`. Output one Markdown response, 200-300 words.
No preamble.

## Context

The project ships an MCP server that delegates summarize / extract /
classify to a local Qwen3 (oMLX), token-saving over frontier. A
PreToolUse hook (`.claude/hooks/enforce-bridge.sh`) blocks Claude
Code from reading large files directly, forcing bridge routing. Two
bands:

- External files > 1 KB → block
- Project-internal "analysis paths" > 4 KB → block

Today commit `f8a8fc1` REMOVED `docs/scope-memos/` from the default
analysis-path set, with this argument:

> Scope memos are design docs under iterative editing, same tier as
> source code — they need raw Read access for Edit's `old_string`
> prerequisite, not bridge summarisation.

The project PM is now pushing back: "why should design docs be exempt
from the hook?" The author (Claude) agreed the fix is rationalised
laziness — same shape as the soft-rule failures that motivated the
whole hook system.

## The actual tension

Hook only sees Read tool-input (path + size). It can't distinguish:
- **For-Edit Read** — need byte-perfect context for `old_string`
  matching. Bridge `extract` with a verbatim schema CAN produce
  byte-perfect chunks, but a 4B model occasionally fails (Edit then
  fails-fast — recoverable but adds friction).
- **For-understanding Read** — reviewing a Draft for consistency,
  finding section numbers, comparing versions. Bridge tools are
  strictly better; raw Read is waste.

## Today's design principle (from scope memo §1.1, written same day)

Hook should gate **sub-pattern A** (large input → small structured
output, frontier never touches raw bytes). Discipline (not hook) for
**sub-pattern B/C** (judgment, fan-in synthesis).

Scope memo Read for understanding ≈ sub-pattern A. Scope memo Read
for Edit prerequisite ≈ source-tier interaction (sub-pattern A
doesn't really apply — you'll Edit immediately after, the goal isn't
"compress input"). The two are on opposite sides of the principle.

## Options

- **A. Revert `f8a8fc1`** — scope memos back in analysis paths.
  Bridge-extract-then-Edit becomes mandatory workflow. High friction.
  Aligns rigorously with §1.1.
- **B. Keep current** — scope memos exempt. Low friction. Same
  shape as the soft-rule failures the hook was built to prevent.
- **C. Per-session env override** — default gated; intensive editing
  sessions set `OMCP_HOOK_EXTRA_ALLOWED_PREFIXES=/.../scope-memos`.
  Decision moment preserved at session start.
- **D. Higher threshold for scope memos only** — e.g. 8 KB instead
  of 4 KB. Compromise; doesn't actually solve the for-Edit vs
  for-understanding question.
- **E. Hook warns but doesn't block** — exit 0 + stderr nag.
  Equivalent to soft rule. Defeats motivation.

## Your task

Pick ONE option (or propose F). Be concrete:
1. Which option fits a project whose PM has *repeatedly* pushed back
   on soft-rule slippage, and why?
2. What's the realistic friction cost in the chosen option?
3. Is the "for-Edit vs for-understanding" distinction worth solving
   via hook complexity, or via user-side discipline?

Output the comment body only — no preamble, no meta-discussion.

Write to your path:
- copilot → `/Users/rd/ollama-claude/.claude/brainstorm/hook-scopememo-debate-copilot.md`
- gem     → `/Users/rd/ollama-claude/.claude/brainstorm/hook-scopememo-debate-gem.md`
- nv_pro  → stdout (will be captured)
