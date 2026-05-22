# Brief: meta-review of the synthesizer's 5-patch plan (2026-05-22 EOD)

You are 1 of 2 voices doing an **adversarial review of the synthesis**
(not the underlying work). The synthesizer (Claude orchestrator) ran 3
voices on today's work units. Now: was the synthesis itself fair?
Where did the synthesizer over-weight, under-weight, or cherry-pick?

Hard constraint: rebut with specifics. If you have no objection to a
specific patch decision, say "concur" — don't pad. Be terse.

## What the 3 voices voted (per question)

| Q | Claude | agy_pro | ghm-low |
|---|---|---|---|
| Q1 marker auto-expire 60min | Revise (touch on bypass) | Sound | Revise |
| Q2 ghm custom tier defer | Sound | **Redesign** | Sound |
| Q3 bytes/4 CJK | Revise (min bytes/4, chars/2) | Revise (bytes/2) | Redesign |
| Q4 gem structural refuse | Sound | Revise (length guard at line 165) | No-evidence |
| Q5 Rule 1 HTTP 403 | Revise (WebFetch line) | Revise | (cut off) |
| Q6 3 new anti-patterns | Revise (merge #3 → #17) | Revise (amend #17) | (cut off) |
| Q7 session order B→C→A | No-evidence (lean Sound) | No-evidence | (cut off) |
| Q8 missed items | **3 found** | 1 found (BUT hallucinated) | (cut off) |

Notes:
- agy_pro Q8 hallucinated picker shape: claimed picker "pings all
  candidates before selection" — actual code (helpers.sh:439-447) is
  `for m in cands: if ping(m): return` (try-first-then-fallback).
  Synthesizer used this as evidence to down-weight agy_pro's review.
- ghm-low cut off at Q5 due to max_tokens=600 bug (which was fixed
  mid-review, raised to 2000; this is "bug D" from the session).
- Claude Q8 claim that "marker not in CLAUDE.md" is FALSE — c07148d
  did add it (CLAUDE.md line 123 currently has it). Claude
  hallucinated absence. Synthesizer caught this and noted it.

## Synthesizer's verdict + 5-patch plan

| Q | Final call | Action |
|---|---|---|
| Q1 | REVISE | touch on bypass — 1 line in enforce-bridge.sh |
| Q2 | SOUND | defer custom tier — agy_pro Redesign overruled 2-1 |
| Q3 | REVISE | `min(bytes/4, chars/2)` in `_ghm_call` |
| Q4 | SOUND | gem docstring stays; orchestrator is structural gate |
| Q5 | REVISE | add 403→WebFetch escalation line in Rule 1 |
| Q6 | REVISE | 2 new anti-patterns + amend #17 (not 3 new) |
| Q7 | SOUND | order B→C→A defensible |
| Q8a (picker dup) | DEFER | flag for v0.7 refactor |
| Q8b (gpt-oss exclusion) | REVISE | remove from NIM bad list |
| Q8c (marker doc) | NOOP | Claude hallucinated; already in CLAUDE.md |

**5 patches before commit**:
1. enforce-bridge.sh — touch on bypass
2. `_ghm_call` — CJK token estimate
3. `_nim_pick_model` — remove `gpt-oss` from exclude list
4. anti-hallu decision file Rule 1 — add 403 escalation line
5. anti-hallu decision file anti-pattern section — renumber 2-new+amend

## Your review questions

A. **Q2 Redesign overrule**: agy_pro argued deepseek-r1 (in custom
   tier) is load-bearing for URL audits — citing the anti-hallu doc.
   Claude said custom tier needs distinct call shape (no max_tokens,
   reasoning_content field). Synthesizer judged 2-1 SOUND on the
   "defer with TODO" path. Is this overrule fair, or is custom tier
   actually load-bearing today and deferral wrong?

B. **Q8 agy hallucination weight**: Synthesizer cited agy_pro's
   picker-shape misread as evidence to down-weight agy_pro broadly.
   Is this fair, or is the misread a Q8-specific error that
   shouldn't taint Q2 (which was a separate, evidence-backed dissent)?

C. **Missed dissent**: 3 voices, 8 questions = 24 individual judgments.
   Did the synthesizer's table miss any voice's evidence-backed
   minority view that deserves separate handling?

D. **Over-aggressive vs under-aggressive**: 5 patches = right scope?
   Or are some patches premature (e.g. Q8b "gpt-oss" was excluded for
   a specific reason — early testing showed it returned empty), or
   are we missing necessary patches?

E. **Verdict on the meta-review**: SYNTHESIS-OK / SYNTHESIS-FLAWED-MINOR
   / SYNTHESIS-FLAWED-MAJOR. If flawed, what's the specific call to
   change?

## Output shape (≤500 words)

For each of A-D, ONE of:
- **Concur** (no objection)
- **Rebut**: specific counter-argument with evidence
- **Missed**: a third option neither side raised

End with E + self-bias note (1 line each).
