# Decision: v0.7+ scope — 12 axes → 5 P0 + 2 P1, +1 new (uninstall)

Date: 2026-05-18
Trigger: 7th brainstorm round today; dogfood new ghm-only voice
portfolio after PAT activation
Voices: ghm@openai/gpt-4o, ghm@deepseek/deepseek-r1, ghm@meta/
llama-4-maverick-17b-128e-instruct-fp8, ghm@mistral-ai/mistral-
medium-2505 (all 4 voices via GitHub Models — first ghm-only
fan-out)
Brief: `.claude/brainstorm/v07-scope-reduction-brief-2026-05-18.md`

## Unanimous P0 (4/4 consensus)

| Axis | Description |
|---|---|
| 1 | `omcp install` — main entrypoint |
| 2 | Hook script as shipped artefact |
| 5 | Config merge strategy when MCP entry exists |

These three ARE the irreducible product. No voice disputed.

## Synthesizer's cut got 1 thing wrong

**Axis 8 (cross-platform fail-fast) PROMOTED to P0.** Original
cut deferred this; 2 voices (gpt-4o + mistral-medium) independently
caught the same concrete failure mode:

> "A Linux/Windows user runs `omcp install`, waits 10 minutes for
> the 7.5GB download, then hits an opaque error because oMLX is
> Apple-Silicon-only." (mistral-medium)

Fix cost is trivial (5 lines: `uname -m` + `sysctl -n
machdep.cpu.brand_string` pre-install). Cost of NOT fixing is
permanent user trust damage at first-impression moment.

→ Axis 8 moves to P0.

## Unanimous missing axis: UNINSTALL PATH

**All 4 voices** independently flagged "uninstall path" as a
critical axis missing from the synthesizer's 12. Direct quotes:

- gpt-4o: "There's no mention of clean rollback for omcp install.
  If a user wants to back out... lack of an uninstall option
  leaves cruft behind — a direct user complaint vector."
- deepseek-r1: "Without omcp uninstall (or equivalent), users
  face manual hook/config cleanup — a support nightmare."
- llama-4: "Providing a clear uninstallation process is crucial
  for user trust and flexibility."
- mistral-medium: "How do users cleanly remove the hook and
  configs? Critical for testing and real-world use."

Add as **axis #13 — uninstall path** → also P0. (You can't ship
an install command without an uninstall command; it's
table-stakes.)

## Revised scope (12 → 5 P0 + 2 P1, +1 new = 6 P0 + 2 P1 = 8 total)

| Tier | Axes |
|---|---|
| **P0 — v0.7 must** (6) | 1, 2, 5, 8, 13 (NEW: uninstall) |
| **P1 — v0.7 should** (2) | 3 (--verify), 4 (model download consent UX) |
| **defer to v0.8+** (6) | 6 (sentinel), 7 (multi-client), 9 (npx-vs-npm), 10 (POSIX-vs-Node), 11 (upgrade-path), 12 (SEP-2663) |

**12 axes → 8 (6 P0 + 2 P1).** Original synthesizer cut had
3 P0 + 2 P1 = 5; revised has 8 (added 8, 13). Net result: scope
is TIGHTER than what was in the Draft 0 memo (was "12 + 10 open
questions"), but slightly broader than my too-aggressive initial
cut.

## Other voices' partially missed picks

- **Preflight system checks** (deepseek-r1, 1/4): Node version,
  Apple-Silicon detection, write-permission test BEFORE
  install. Mostly subsumed under axis 8 (cross-platform fail-
  fast) — same root mechanism (`uname` + permission probe).
- **Observability / `--debug` flag** (gpt-4o + mistral, 2/4):
  Useful but not v0.7-gating; add to v0.8 backlog.

## Process win — first ghm-only fan-out

This is the first successful fan-out using ONLY GitHub Models
voices (no gem-pro, no copilot, no nv_pro). Validation:

- All 4 voices completed under 30 s (gpt-4o: ~15s; deepseek-r1:
  ~25s with reasoning trace; llama-4 + mistral-medium ~15s)
- 4 distinct family perspectives (OpenAI / DeepSeek / Meta /
  Mistral) — no same-family redundancy
- Unanimous catch on missing axis (uninstall) — high-signal
  result that justifies the portfolio expansion
- DeepSeek-R1's `<think>` tags didn't pollute the bridge.extract
  output — schema-constrained extraction handled it correctly

→ `ghm` voice family proven for fan-out work. Going forward,
GitHub Models is the primary fan-out workhorse; gem-pro reserved
for cases requiring agentic tools (rare).

## Next steps for v0.7+ scope memo

1. **Update `docs/scope-memos/v0.7.0-install-2026-05-15.md`**:
   - §2 "Candidate scope": replace with 6 P0 + 2 P1 list
   - §4 "Open questions": close items resolved by this round
     (model download consent → keep as P1 question; sentinel
     → defer to v0.8); flag uninstall as new open question
     ("uninstall scope: just-our-hook? full MCP-entry removal?
     dry-run flag?")
   - §5 "Prior Art Review (TODO)": narrow PA scope from "all 12
     axes" to "5 P0 + 2 P1" — ≥3 candidates per category
   - §8 "Next step": PA on revised scope → Draft 1 → Auditor
2. **PA review** on the 8 axes only (not all 12) — saves
   roughly 33% PA effort
3. **Auditor protocol round** on Draft 1 (gem-pro + ghm voices)

## Voice logs
- `tmp/ghm-gpt4o-v07-scope.log`
- `tmp/ghm-deepseek-v07-scope.log`
- `tmp/ghm-llama4-v07-scope.log`
- `tmp/ghm-mistral-v07-scope.log`
