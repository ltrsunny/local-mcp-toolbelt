# Brief: audit the 3 PA task chips just queued (and the assumption that PA is the next step)

You are reviewing a process / framing decision the synthesizer
(Claude) just made WITHOUT running it past audit first. Push back
hard. Output 250-400 words. End with one explicit verdict per
sub-question + an overall SHIP-as-is / REVISE / RESTART.

## Context

`local-mcp-toolbelt` v0.6.0 just shipped. v0.7+ scope memo
(`docs/scope-memos/v0.7.0-install-2026-05-15.md`) defines a one-shot
`omcp install` feature. Per the project's feature-intake-rule, the
next step is Prior Art Review (≥3 candidates per category) → Draft 1
→ Auditor protocol → code.

Claude just spawned 3 `ccd_session/spawn_task` chips, one per PA
category, with self-contained briefs. The chips will run in fresh
worktrees when the user clicks them.

## What was decided WITHOUT audit

1. **3-category decomposition**:
   - Install UX (one-shot CLI + multi-client config write)
   - Hook distribution (npm-package-as-hook-source)
   - Model / weight fetching
2. **Seed candidates per category** (4-6 each, taken from scope memo §5):
   - Install UX: `claude mcp add`, `gh extension install`,
     `pre-commit install`, vscode-cli, homebrew, nvm/pyenv
   - Hook: Husky, lefthook, VSCode contribution model, pre-commit
   - Model: `huggingface-cli download`, `ollama pull`, lm-studio,
     MLX upstream cache conventions
3. **Comparison dimensions** (8 / 8 / 9 per category) — extensively
   specified.
4. **Output format**: 250-400 line markdown per category, with
   executive summary + per-candidate write-up + comparison table +
   recommendations.
5. **Operating constraints passed to chips**: hook is active,
   `gem --strict` for adversarial calls, NIM dynamic discovery, mini
   fan-out for non-trivial design decisions within the PA.
6. **Workflow assumption**: PA happens BEFORE Draft 1. The 3 PAs
   run in parallel.
7. **One more chip exists** from earlier (macOS 26 + Foundation
   Models spike) — Claude treated it as orthogonal to the 3 PAs.

## Audit questions

1. **3-category decomposition right?** Missing: uninstall UX,
   telemetry, security review of writing to user-config paths, post-
   install verification? Or sub-aspects of the 3?
2. **Seed candidates right?** Anything missed? Anything that won't
   inform (e.g. lm-studio is closed-source — readable enough)?
3. **8/8/9 comparison dimensions over-specified?** Risk: mechanical
   table-fill, hides real differences. Fewer + focus better?
4. **PA-first workflow right?** Alternatives: skip PA, write Draft
   1 from Claude's knowledge, audit that; or combine PA + Draft 1;
   or Auditor protocol on Draft 0 first.
5. **3 PAs actually independent?** Install UX includes "how to
   install hooks". Parallel authors may produce contradictions.
6. **Operating constraints over-prescribed for research?** PA is
   read-heavy / write-light. "Use gem --strict, NIM smoke-ping, mini
   fan-out" may be over-process for literature review.
7. **macOS 26 spike should feed IN, not run alongside?** AFM is a
   new model-fetch story (zero-download); macOS 26 launchd changes
   may affect install UX. Run macOS 26 first?

## Your task

Pick a verdict per sub-question (1-7), give reasoning in 100-200
words total, and end with an overall verdict:

- **SHIP AS-IS** — the 3 chips are fine to run as queued
- **REVISE** — significant changes needed; identify the top 2-3
- **RESTART** — wrong shape entirely; propose alternative

Be terse and specific.
