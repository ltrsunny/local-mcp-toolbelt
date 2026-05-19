# Brief: integrate new tool findings + collectively review project's structural problems

You are auditing the `local-mcp-toolbelt` project's current
structural state in light of external tool changes that landed
TODAY. Output 300-500 words. Rank the top 3-5 problems by severity.
Push back hard if the project's direction looks misaligned given
the new prior art.

## What just changed externally (today 2026-05-18)

### Gemini CLI 0.42.0 (today 12:13)

- `gemini hooks migrate` — imports Claude Code hooks. **Confirms
  Gemini's hook format = Claude Code's.**
- `gemini skills install <source> [--scope] [--path]` — git/local
  install, scope-aware. Plus `enable/disable/link/uninstall/list`.
- `gemini gemma setup/start/stop/status/logs` — LiteRT-LM local
  Gemma server lifecycle. Sibling of oMLX-via-brew-services.
- `-w, --worktree`, `--approval-mode plan`, `--policy`/`--admin-policy`
  Policy Engine, `-o text|json|stream-json`, native session
  management (`-r`, `--list/delete-session`, `--session-id`).

### Copilot CLI 1.0.49

- `--effort` adds `"none"` / `"max"`.
- `--acp`, `--additional-mcp-config <json>`, `--disable-mcp-server`,
  `--disable-builtin-mcps`, `--enable-reasoning-summaries`,
  `--continue`, `--connect=sessionId`, `--autopilot`,
  `--experimental`.

### NIM catalog (125 models, grew today)

Newly surfaced: `meta/llama-4-maverick-17b-128e-instruct`
(smoke 200 today, one voice in this audit uses it),
`qwen/qwen3-next-80b-a3b-instruct|thinking`, `qwen/qwen3.5-122b-
a10b`, `google/gemma-4-31b-it`, `microsoft/phi-4-*`,
`mistralai/mistral-large-3-675b`, `ibm/granite-3.0-*`.

`bytedance/seed-oss-36b` is "smoke-OK + real-call fail" cohort.
Five attempts today, all empty-body silent drops at real workload.

## Current project state (v0.6.0 shipped + v0.7+ Draft 0)

- v0.6.0 tagged + pushed (`f0cc75c`). Async-job triad,
  per-tool thinking-mode defaults, Tier D demoted, 207/207 tests
  passing, stdio cross-client smoke green.
- v0.7+ scope memo
  (`docs/scope-memos/v0.7.0-install-2026-05-15.md`) Draft 0,
  proposes `omcp install` (one-shot brew + service + models +
  multi-client MCP config + hook wiring). 319 lines.
- 4 task chips pending user click:
  - 1 macOS 26 + Apple Foundation Models spike (pre-dates today's
    Gemma routing discovery in gemini-cli — overlap not yet
    integrated)
  - 3 PA chips (install UX, hook distribution, model fetching)
    that today's audit found mis-framed (categories not
    independent; dimensions over-specified; constraints over-
    prescribed). Expected to be dismissed by user.
- 24 commits today, 4 audit cycles, multiple framing-failure
  catches (synthesizer kept "spawning before auditing the brief"
  — added as anti-pattern #4 in auditor-protocol memory).
- Auditor protocol memory file at
  `~/.claude/projects/-Users-rd-ollama-claude/memory/auditor-protocol.md`
  has 4 anti-patterns + per-round NIM dynamic discovery section.

## Your task

Given the external tool changes that landed TODAY, what are the
top 3-5 STRUCTURAL problems in the current project direction? Be
ranked by severity. For each:

- State the problem in one sentence.
- Cite the specific tool/feature change that exposed or worsened it.
- Propose one concrete remediation.

Specifically consider:

1. Does `gemini hooks migrate` + `gemini skills install` change
   what v0.7+ `omcp install` should be (collapse some, separate
   some)?
2. Does `gemini gemma setup/start/stop` make the oMLX-via-brew-
   services pattern stale, or validate it?
3. Does `-o json` + Policy Engine in gemini-cli + `--acp` in both
   change how `gem`/`copilot` should be invoked from this project's
   fan-out scripts?
4. Is the "smoke-ping ≠ working voice" pattern (seed-oss) a
   real protocol bug worth fixing tonight, or a tomorrow task?
5. Is anything in the v0.6.0 ship NOW obsolete or weakened by
   today's external changes?

Push back if you spot a problem the list above doesn't surface.
Output: comment body only, no preamble.
