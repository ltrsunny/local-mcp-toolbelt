# Brief: meta-meta review of synthesizer's self-critique on 4 new anti-patterns

You are 1 of N voices in the THIRD layer of review:
- Layer 1: synthesizer (Claude orchestrator) wrote 4 new anti-pattern
  entries today
- Layer 2: synthesizer ran self-critique, found self-referential problems
  + N=1 evidence + space-overhead concerns, proposed 6 fixes
- Layer 3 (you): attack the self-critique. Is it over-correcting? Missing?

Brief follows #22 (today's new rule) — facts marked **EMPIRICAL** /
**ASSUMED** / **CITED** explicitly.

## Today's 4 new anti-patterns proposed for auditor-protocol.md (EMPIRICAL — already added 2026-05-22)

1. **Citation ≠ Evidence** — citing GitHub issue / blog / commit without
   empirical verification is hallucination by proxy
2. **Brief framing pre-shapes voice convergence** — drafter must mark
   load-bearing facts as EMPIRICAL or ASSUMED; voices flag propagation
3. **Stale-revalidation gap** — "verified <date>" claims gating
   architecture need re-test; ≥1 week + load-bearing = MUST retest
4. **Anti-woozle self-immunity illusion** — voice warning about woozle
   while itself hallucinating IS the woozle

## Synthesizer's self-critique (just done by Claude orchestrator)

| # | Self-critique | Proposed fix |
|---|---|---|
| #21 Citation ≠ Evidence | LiteLLM #21041 used as example, but synthesizer DID NOT verify that issue's claim — accepted Claude r2's transcription. Self-referential problem. | Swap example to gem's "Accessed February 2026" (100% empirically verified — gem is non-agentic, can't access URLs) |
| #22 Brief framing | Anti-pattern entries ARE briefs for future readers. Synthesizer's prose doesn't follow the rule (no EMPIRICAL/ASSUMED labels). | Delete sub-rule "voices must flag propagation" as mechanism-less |
| #23 Stale-revalidation | "≥1 week" threshold arbitrary; no enforcement mechanism (hook/schedule/reminder) | DOWNGRADE from iron-rule anti-pattern to brainstorm note until mechanism exists |
| #24 Anti-woozle meta-pattern | N=1 evidence (Claude Agent's one hallucination). Insufficient to declare iron rule. | DELETE entry entirely |
| 5 uncommitted brainstorm briefs | First 2 (copilot-free dynamic picker) document designs LATER empirically disproved. Future readers see "5-voice consensus" without context. | Commit only cross-provider-byok-picker + tools-split-strategy; DELETE first 2 |
| tool-audit-2026-05-22 banner | Keep as is | Keep |

## Layer-3 questions (attack the self-critique)

### A — Is #21's example swap actually a fix?
Synthesizer plans to swap LiteLLM #21041 → "gem Accessed February 2026"
example. Does that EMPIRICALLY-grounded swap solve the self-reference?
Or does it just dodge — the underlying issue is "synthesizer cites
without verification", which can recur with any new example.

### B — Is #22's mechanism deletion correct?
The "voices must flag propagation without verification" is described
as "mechanism-less". Is it really? Or is it a SOCIAL norm enforced
by voice culture (like "self-bias note" sections)? Deleting may
remove the only enforcement vector.

### C — #23 downgrade premature?
Synthesizer says "no mechanism = downgrade to brainstorm note". But
the rule "ANY 'verified <date>' claim load-bearing for architecture
MUST be re-tested before relying on it" IS a self-applied heuristic
that requires no tooling — just discipline. Downgrade =
under-correction?

### D — #24 sample-size argument valid?
"N=1 not enough for iron rule". Counter: is meta-awareness immunity
illusion **structural** (a known failure mode in human/LLM cognition
generally) such that 1 instance is enough trigger? Or genuinely N=1
anecdote not yet pattern?

### E — Brainstorm brief deletion criteria?
Synthesizer wants to delete first 2 briefs (copilot-free dynamic
picker / round-2 divergence) because "empirically disproved".
Counter: those briefs DOCUMENT the woozle process — deleting them
loses the empirical record of "5 voices wrongly converged". Future
training data / process learning loss?

### F — What if the WHOLE 4-pattern addition is process cancer?
Synthesizer noted "session后半段 = 全是过程产物，零代码落地". Adding
4 anti-patterns IS more process. Should we keep ZERO of them?
Or is at least #21 (Citation ≠ Evidence) load-bearing enough to keep?

### G — Anything synthesizer missed?
What's a 7th critique angle synthesizer didn't see?

## Output shape (≤600 words)

For each of A-G:
- **Concur** / **Counter-argue** / **Refine** with one-sentence reasoning

End with:
- **Your verdict**: SYNTHESIZER-OVER-CORRECTING / SYNTHESIZER-UNDER-CORRECTING /
  ROUGHLY-RIGHT / WHOLE-EFFORT-CANCEROUS
- **Top recommendation** (one concrete action)
- **Self-bias note** (Anthropic family / Gemini / OpenAI / etc.)

Hard constraint: REAL evidence preferred. If you cite anything (issue,
blog, doc), explicitly verify or mark CITED-UNVERIFIED. Per #21.
