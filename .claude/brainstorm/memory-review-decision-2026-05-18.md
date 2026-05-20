# Decision: memory cleanup — 5 actions, voice-confirmed

Date: 2026-05-18
Trigger: User "完成这些工作后集体对抗性审阅目前的所有 memory"
Voices: gem-pro / gem / nv_pro@mixtral-8x22b / nv_pro@nemotron-49b
Brief + bundle: `.claude/brainstorm/memory-review-{brief,bundle}-2026-05-18.md`
Platform diversity: 3 (Google OAuth + Google API + NIM)
Voice quality: gem-pro best signal (caught self-contradiction +
self-disclosed bias re: Gemini family rules); nemotron-49b weak
(short findings); mixtral middle; gem (3.5-flash) middle.

## Top consensus cleanup actions

| # | Action | Votes | Rationale |
|---|---|---|---|
| 1 | **Merge `brainstorm-iron-rule.md` → `auditor-protocol.md`** | **4/4** | Same iron rule about 3+ voice fan-out is restated in 2 files; auditor-protocol is the comprehensive one |
| 2 | **Rename `ollama-mcp-bridge` → `local-mcp-toolbelt`** across all files | **4/4** | Project renamed; stale references in feature-intake-rule.md + MEMORY.md + others |
| 3 | **Aggressively prune `token-log.md`** (delete log entries, keep protocol; OR delete entirely) | **3/4** | Historical April 2026 data; no active runtime guideline |
| 4 | **Fix `auditor-protocol.md` Step 2 script self-contradiction** | gem-pro caught | Step 2 example uses `cat ... \| gem "..."`; Anti-patterns later bans bare `gem` for adversarial use, requires `gem-pro`. The example code violates its own file's rule. |
| 5 | **MEMORY.md re-order: critical iron rules first** | gem-pro + gem | `language.md` (trivial) currently listed first; auditor-protocol + brainstorm-iron + bridge-trigger should head the index for priority signaling |

## Lower-priority items (defer)

- `restart-reminder.md` references stale 2026-05-04 commit hash — defer (low impact)
- `model-reminder.md` has internal contradiction (every-turn vs user-mentioned) — could fix
- `decision-log-rule.md` partial dead-weight (meta-rule) — could merge into MEMORY.md or pm-role.md
- "Memory lifecycle management" missing — propose: after every 16+ anti-patterns growth event, run this exact review protocol again (today's bar)
- "Iron-rules summary at top of MEMORY.md" — add as part of action #5 re-ordering

## Self-bias flagged

**gem-pro disclosed Google self-bias** on auditor-protocol re-route
critique (over-engineered routing for Gemini endpoints). Half-
discounted that specific item per anti-pattern #14 protocol.

Without gem-pro's catch, the auditor-protocol self-contradiction
(Step 2 `gem` vs ban) would have stayed hidden. **Same-family voices
sometimes catch what cross-family voices can't** (Google native voice
saw inconsistency in Google-tool-routing rules). Discount on conclusions
that benefit voice's family; FULL CREDIT on contradiction catches even
inside voice's family.

## What was NOT done by today's session

Today's session added 3 anti-patterns to `auditor-protocol.md`
(#14 platform-mono, #15 declare-path-dead, #16 tool-by-assumption).
File grew to 16.9 KB / 233+ lines. Voices independently noted that
critical patterns are buried beneath minor ones — **action #5
re-ordering will help, but auditor-protocol itself may also benefit
from internal section reorganization** (deferred for now).

## Voice logs
- `tmp/gempro-memory-review.log` (strongest: caught contradictions)
- `tmp/gem-memory-review.log` (REST direct)
- `tmp/mixtral-memory-review.log`
- `tmp/nemotron-memory-review.log` (weakest signal — short findings)
