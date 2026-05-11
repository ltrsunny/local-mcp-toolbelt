# local-mcp-toolbelt v0.5.0 — adversarial state audit (2026-05-10)

## Where we landed (last 6 commits this session)

```
b2c8316  feat(hooks): hard-enforce bridge usage for external file reads
50b50ab  fix(v0.5.0): non-thinking Tier B + strict-mode schema normalization
120a24b  feat(v0.5.0): collapse to single oMLX backend; remove Ollama + llama.cpp
753f746  docs(notes): v0.5.0 retrospective + oMLX overlap analysis
5522de3  feat(v0.5.0): per-tool MAX_OUTPUT_TOKENS caps + Tier D opt-in
8b0251b  docs(eval): 14B oMLX eval + Tier D promotion decision
62112fb  feat(v0.5.0): MlxHttpBackend via oMLX + first eval run
```

Single backend. Single inference engine (oMLX). 147 tests pass.
End-to-end verified: hook blocks direct external reads → bridge round-trip
returns compressed result, ~805 tokens saved per round-trip.

## Architecture (current)

```
MCP client (Claude Code, Cursor, etc.)
    ↓ stdio MCP protocol
local-mcp-toolbelt (Node 22 process)
    ↓ HTTP /v1/chat/completions  (response_format: json_schema strict + /no_think)
oMLX (jundot/omlx, brew service, port 8000)
    ├── Qwen3-4B-Instruct-2507-4bit  (Tier B, non-thinking)
    ├── Qwen3-8B-4bit                (Tier C, thinking + /no_think injected)
    └── Qwen3-14B-4bit               (Tier D, thinking + /no_think injected)
```

Plus: `.claude/settings.json` + `.claude/hooks/enforce-bridge.sh` ship with
the repo to hard-enforce bridge usage on Read/Bash for external files >1KB.

## Known mess (the "屎山" the user is asking about)

**Documentation**:
- `README.md` (top-level + `packages/core/README.md`) still tell the v0.4.0
  llama.cpp story. Stale.
- `CHANGELOG.md` has no v0.5.0 entry; last entry is v0.4.0.
- `docs/scope-memos/v0.5.0-tier-d-eval-2026-05-06.md` has been amended 4
  times (Tier-D 14B eval, capped re-run, all-MLX collapse). Frankenstein —
  the "decision" sections contradict each other; reader has to scan
  chronologically.
- `docs/scope-memos/v0.4.0-llama-cpp-backend-2026-05-04.md` is now
  obsolete — describes a backend we just removed.

**Tests**:
- `tests/smoke-bridge.mjs` deleted; no replacement integration test
  against a real oMLX server. CI is in-process only via
  `_installTestBackend(RecorderBackend)`.
- `migration-snapshot.test.ts` is misnamed (was for v0.2.0 Ollama→backend
  migration; now captures v0.5.0 ChatOptions contract).
- `MlxHttpBackend.normalizeForStrictMode` only has unit-level tests —
  no integration test that the produced schema is actually strict-mode
  valid against oMLX.
- No test for `enforce-bridge.sh` itself; pipe-tested manually.

**Config**:
- `DEFAULT_CONFIG` hardcodes `Qwen3-8B-4bit` for Tier C — but Qwen3-4B
  Instruct-2507 is also on disk and could serve C with shorter latency.
  Asymmetric vs single-model still not data-backed (eval not re-run on 4B).
- `cli.ts` has `--tier-{b,c,d}-model` but no `--tier-{b,c,d}-num-ctx`.
- oMLX cache config (hot 4GB + SSD `~/.omlx/cache`) was set in user's
  `~/.omlx/settings.json`. Not in the repo. New installs miss this.

**Process artifacts**:
- `docs/notes/v0.5.0-process-failures-2026-05-07.md` — written but the
  failures keep happening (e.g. forgot to use bridge for output
  generation, just discovered).
- `docs/notes/v0.5.0-omlx-overlap-2026-05-07.md` — sound conclusion but
  never reread.
- `docs/notes/v0.4.0-pending-decisions-2026-05-04.md` — untracked, stale.
- 8 untracked scratch files in repo root (`check_ds.py`, `search_*.py`,
  `s.mjs`, etc.) from earlier sessions. Workspace pollution.

**Output-side gap (just surfaced)**:
- Bridge handles INPUT compression (summarize/extract/classify route via
  source_uri). Hook enforces it.
- Bridge does NOT handle OUTPUT generation. `transform` tool exists but
  is rarely used by Claude. CHANGELOG entries, doc rewrites, commit
  messages, boilerplate scripts — all written by Claude (frontier
  tokens) when they could be transform calls.

**Memory files**:
- `bridge-trigger-checklist.md` is redundant now that the hook exists.
- `model-reminder.md` still asserts soft rules.
- The two are a "belt + suspenders + duct tape" stack.

## Open strategic questions

**Q1. Which is the higher-leverage v0.6.0 target?**

  - (a) **Output-side bridge** — add `generate` tool + Write/Edit hook;
    aim to get 30-50% of Claude's *output* tokens routed through local
    model. Complementary to Q0.5 input enforcement that just shipped.
  - (b) **Eval automation** — re-run matrix on 4B-Instruct as Tier B,
    decide single-model vs asymmetric on data, lock in numCtx tuning.
    Pure measurement, no architecture change.
  - (c) **Documentation pass** — README, CHANGELOG, scope-memo
    consolidation. Make the project legible to a new contributor /
    future self. No new code.
  - (d) **Cache benefit measurement** — quantify oMLX KV-cache hit rate
    across consecutive bridge calls. If high (e.g. >50% prefix reuse),
    write up as a feature. If low, fix or remove.

**Q2. The scope-memo Frankenstein.** Is it worth rewriting
`v0.5.0-tier-d-eval-2026-05-06.md` as a clean post-mortem with
chronological appendix, or just delete and write a new
`v0.5.0-shipped-2026-05-10.md` that captures only the final state?

**Q3. Smoke tests.** With Ollama deleted, the 58-test
`smoke-bridge.mjs` is gone. What's the right replacement?
  - (a) Skip — unit tests + manual oMLX verification is enough
  - (b) New `smoke-omlx.mjs` against a real oMLX server, gated behind an
    env var (`OMCP_SMOKE_OMLX=1`), excluded from CI but runnable locally
  - (c) Use the eval harness as the smoke test (already runs against
    real oMLX, just not on every push)

**Q4. The Frankenstein scope memos.** Three docs say "we decided X" with
contradicting Xs as the session evolved. Rewrite, delete, or annotate?

**Q5. Workspace hygiene.** 8 untracked scratch files in repo root. Add
to `.gitignore`, delete, or commit to a `.scratch/` dir?

## What I want from you (reviewer)

Pick a position on each Q with **terse rationale (≤80 words per Q)**. End
with a **single biggest-mistake** call: what's the worst architectural
or process choice that's still in the repo right now, and what would
you replace it with?

Be adversarial. Don't soften. The user explicitly asked for a "屎山" /
"shit pile" review.
