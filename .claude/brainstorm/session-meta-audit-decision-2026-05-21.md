# Decision: session meta-audit — voices say process cancer; cuts pending

Date: 2026-05-21 (post-restart)
Trigger: PM "A" — adversarial review of today's session as a whole
Voices: ghm@openai/gpt-4o, ghm@deepseek/deepseek-r1,
nv_pro@nvidia/llama-3.3-nemotron-super-49b-v1
Platform diversity: 2 (GitHub Models + NIM); copilot-free skipped
to avoid agentic over-explore failure mode

## Tally (5 axes)

| Axis | gpt-4o | deepseek-r1 | nemotron | Consensus |
|---|---|---|---|---|
| decision-to-product ratio | **BAD** | mixed | **BAD** | bad-leaning |
| memory bloat | mixed | **BAD** | mixed | mixed-bad |
| helpers.sh complexity | **BAD** | **BAD** | **BAD** | **UNANIMOUS BAD** |
| brainstorm count | **BAD** | **BAD** | **BAD** | **UNANIMOUS BAD** |
| anti-pattern #17 efficacy | over-correction | bad | mixed | skeptical |

## Harshest verdicts (quoted)

**deepseek-r1**: "30 brainstorm files (e.g. omcp-install-steelman) and
nim-tier-map diagnostic serve as **Claude's self-assigned busywork —
a hedonic treadmill where the AI mistakes writing about work for
working**. When `meta(process)` commits outnumber tools actually used
3:1, you're culturing **process cancer**."

**gpt-4o**: "exceeding diminishing returns on meta-automation
principles (helpers.sh, memory, anti-patterns). **Product value
delivery appears sidelined.**"

**nemotron**: "Simplify the helpers.sh ecosystem by consolidating
overlapping functions (e.g., gem, gem-pro, gem-pro-escalate into a
single parameterizable gem function)."

## Synthesizer's framing flaw the voices missed

Voices implicitly blame Claude for all 30 brainstorms. **Reality:
user explicitly drove most of them** via "对抗性脑暴" / "审" / "全
干" / "都干" instructions across 3 days. Voices treated this as
unforced Claude busywork; partially unfair.

**But the kernel of truth stands:**
- ~5 brainstorm topics could plausibly have been single-source
  Claude decisions (commit-history-hygiene Round 1 absolutely;
  bridge-forgetting; some v07 sub-rounds)
- 7 new anti-patterns added in 3 days IS high velocity vs
  ~3 anti-pattern adds in the prior ~3 weeks of memory
  history → likely some duplication / over-specificity
- helpers.sh growing 3 → 8 functions in 3 days IS taxonomy
  expansion without subsequent consolidation
- Zero `feat:/fix:/release:` commits in 3 days IS striking even
  under workflow-focused user direction

## Decision — accept partial critique; concrete cuts to consider

### Cut candidates (need user approval per #17 — do not auto-execute)

**Helpers.sh ecosystem (UNANIMOUS bad):**
- Merge `gem-pro` + `gem-pro-escalate` → one function with
  `GEM_PRO_MODEL` env override and built-in fallback chain. Saves
  ~80 lines, one fewer surface area, identical capability.
- Consider: does `gem-pro-escalate` even justify separate name?
  Today's evidence shows 3.1-pro-preview essentially always
  fails → escalate function = sticky 2.5-pro alias.

**Memory anti-patterns (review for dedup):**
- #15 (declare path dead from single failure) and #16 (tool
  by assumption not inspection) overlap significantly — both
  about "verify before concluding"
- #17 (friction-reduction not autonomy-grant) might be
  encoded better as a single line in `pm-role.md` rather than
  a full anti-pattern entry

**Brainstorms (no action needed — already committed; just don't
re-create the pattern):**
- commit-history-hygiene was Round-1 single-source plausible
- v07-strategy-validation duplicated v07-scope-reduction on
  same axes 30 min apart
- bridge-forgetting led to a "decision deferred" outcome — fan-out
  not justified

**Commits (DO NOT revert):**
- Voices implied revert candidates; but reverting commits adds MORE
  meta noise on top of the meta noise. **Net silence > more cleanup**.
- Live with current state; restrain future additions.

## Anti-pattern #17 self-audit

Voices skeptical (3/3 not "good"). Concrete concerns:
- gpt-4o: rule is correct but may over-correct (treating Claude as
  unable to infer intent)
- deepseek-r1: "bad" — bureaucratic rule
- nemotron: mixed, didn't elaborate

**My judgment**: keep #17 but COMPRESS. Currently #17 has ~25 lines
in auditor-protocol.md. Could be 5 lines: rule + 1-line "verified
2026-05-21" + 2 do/don'ts. Will defer compression to user-approved
edit.

## Process learning

**The audit DOES catch process cancer pattern.** I was inside the
treadmill and didn't see it. Three diverse-family voices were
needed to surface the verdict.

**Going forward**: 
- Brainstorm requires concrete trigger (PM-flagged decision OR
  high-uncertainty + multi-axis), not "let's audit X" reflex
- helpers.sh additions need "is this consolidatable with existing"
  check before adding
- New anti-pattern needs "is this distinct from existing 16" check
  before adding to auditor-protocol.md

## Pending user decisions

1. Merge `gem-pro` + `gem-pro-escalate` → 1 function?
2. Compress anti-pattern #17 + dedup #15/#16 overlap?
3. Anything else?

## Voice logs
- `tmp/ghm-gpt4o-meta-audit.log`
- `tmp/ghm-deepseek-meta-audit.log` (sharpest "process cancer" quote)
- `tmp/nemotron-meta-audit.log`
