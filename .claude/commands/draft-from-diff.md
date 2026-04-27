---
description: Draft commit message from current git diff via local Ollama bridge
allowed-tools:
  - Bash
  - mcp__ollama-bridge__diff-semantic-index
---

# Draft commit message from staged diff

1. Run `git diff --staged`. If the output is empty (nothing staged), fall back to `git diff` (unstaged changes). If both are empty, report "nothing to commit" and stop.
2. Write the diff output to `/tmp/omcp-diff-$TIMESTAMP.txt` (use `date +%s` for the timestamp).
3. Call `mcp__ollama-bridge__diff-semantic-index` with `source_uri=file:///tmp/omcp-diff-$TIMESTAMP.txt`. Do NOT pass the diff inline as `diff_text` — large diffs exceed ARG_MAX on macOS.
4. Parse the returned JSON. Compose a commit message in the style used by this repo:
   - **Subject line** (≤ 72 chars): `<change_type>(<scope>): <summary>`
     - `change_type` comes from the JSON field (map `feature→feat`, `test→test`, `docs→docs`, `refactor→refactor`, `fix→fix`, `chore→chore`, `mixed→chore`).
     - `<scope>` is the most-affected sub-package or directory (e.g. `jobs`, `diff`, `mcp`, `chunking`). Use the `files_touched` array to determine scope.
     - `<summary>` is distilled from the JSON `summary` field — must fit with subject ≤ 72 chars total.
   - **Body** (2-4 bullet points or short paragraphs):
     - Describe what changed and why, drawing from `key_decisions`.
     - If `risk_callouts` is non-empty, include a **Risk:** line.
     - If `test_coverage_hint` is `no_test_change` or `unclear` and the change is non-trivial (> 5 lines changed), flag this: "Tests: none added".
5. Output the final commit message, ready to copy-paste.
6. Clean up: `rm /tmp/omcp-diff-$TIMESTAMP.txt`.

$ARGUMENTS
