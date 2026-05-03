---
description: Generate a handoff document so Gemini CLI can take over the current task
allowed-tools:
  - Bash
  - Write
---

# Handoff to Gemini CLI

Triggered when Claude is approaching a quota / context limit, or when a task
clearly fits Gemini's strengths better (long-running multi-file refactor,
divergent web research, large-file analysis).

Steps:
1. Generate timestamp: `TS=$(date +%s)`.
2. Capture current state into `/tmp/handoff-$TS.md` with these sections:
   - **Goal**: 1-2 sentences on what the user is trying to accomplish.
   - **What's done**: bulleted list of completed steps in this session.
   - **What's not done**: bulleted list of remaining steps.
   - **Key files**: absolute paths of files most relevant, with one-line notes.
   - **Recent commits**: output of `git log --oneline -10`.
   - **Current branch state**: output of `git status -s`.
   - **Open questions / blockers**: anything ambiguous or waiting on the user.
   - **Hard constraints**: pull from `CLAUDE.md` — Node 22+, 60s MCP wall,
     Apache-2.0 deps, etc. Gemini hasn't seen CLAUDE.md unless told.
   - **How to verify when done**: how Gemini knows the task is complete
     (which test passes, which file exists, which check returns OK).
3. Print the handoff path so the user can copy it.
4. Print the exact command to invoke Gemini headless:

   ```bash
   gemini --yolo -p "$(cat /tmp/handoff-$TS.md)"
   ```

   …or interactive:

   ```bash
   gemini -m gemini-3.1-pro-preview
   > Read /tmp/handoff-$TS.md and continue the work.
   ```
5. Do NOT invoke Gemini yourself — leave that to the user. The handoff is
   a document, not a launch.

$ARGUMENTS
