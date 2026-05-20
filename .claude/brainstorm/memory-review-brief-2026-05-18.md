# Brief: adversarial review of all memory files

You are one of 4 voices auditing project memory. The full bundle
(`memory-review-bundle-2026-05-18.md`, 47 KB / 12 files) is on
stdin. Read it fully.

## Context (you need this background)

The project (`local-mcp-toolbelt`) ran an intense single-day
session 2026-05-18 with **multiple PM-caught failure patterns**.
That added 3 new anti-patterns to `auditor-protocol.md` and
modified one existing rule. Total now: 16 anti-patterns in that
file alone, plus 11 separate small memory files.

Memory is starting to feel **bloated** — 47 KB total, ~860 lines.
Per-turn auto-injection cost matters. The PM wants honest
prioritization.

## Your task — review axes

For each memory FILE (12 of them), identify:

1. **STALE**: rule refers to gone things (e.g. references
   `ollama-mcp-bridge` which is now `local-mcp-toolbelt`,
   or v0.3.0 setup that v0.6.0 replaced)
2. **CONTRADICTING**: rule conflicts with another rule
   elsewhere in the bundle
3. **REDUNDANT**: rule restates something already said in
   another file (find the duplicates)
4. **DEAD-WEIGHT**: rule never triggers in real sessions, or is
   trivially satisfied by default behavior
5. **MISSING**: based on what you read, what important
   pattern/rule SHOULD be there but isn't
6. **PRIORITY-INVERSION**: critical rules buried beneath
   trivial ones; or vice versa

## Output shape

Be specific. For each finding, cite **file name + section
heading or 1-line quote**. Avoid generic "memory could be
shorter" — only actionable specific items.

Structure:

```
## STALE (max 5)
- file.md "rule X": [reason stale]

## CONTRADICTING (max 3)
- file-a.md "rule X" vs file-b.md "rule Y": [conflict]

## REDUNDANT (max 5)
- file.md "rule X" duplicates file-other.md "rule Y"

## DEAD-WEIGHT (max 3)
- file.md "rule X": [why never triggers]

## MISSING (1-3)
- [what should be there]

## PRIORITY-INVERSION (1-2)
- [observation]

## YOUR TOP-3 CONCRETE CLEANUP ACTIONS
- 1: [specific edit, e.g. "delete X from file.md"]
- 2: [specific edit]
- 3: [specific edit]
```

300-500 words. Be specific to the bundle content, not generic.

## Process notes

- Voices today have fabricated specific names — don't invent
  rule names; only cite what you can actually read in the bundle
- Self-bias: if your model family is relevant to a rule (e.g. you
  are a Google model and there's a Google-specific rule), flag it
- The bundle has FILE: <name> separators — use those to cite

Comment body only, no preamble.
