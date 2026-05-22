# Brief: adversarial review on 2 bugs (2026-05-22)

You are one of 3 voices reviewing two infrastructure bugs caught in
today's anti-hallucination work session. Real research required —
cite official docs / source files / URLs. Hard constraint: if you
cannot verify a claim, say "NOT FOUND — could not verify".
DO NOT fall back to training-data confabulation.

---

## Bug A: helpers.sh `gem` function doesn't set thinkingConfig

**Current code** (helpers.sh:83):

```bash
body=$(jq -n --arg p "$prompt" '{contents:[{parts:[{text:$p}]}]}')
```

Bare contents. No `generationConfig.thinkingConfig`. Model:
`gemini-3.5-flash` (or `GEM_MODEL` override).

**Symptom** observed today: gem produced a research output that:
- Self-identified as "developed by OpenAI" (gem is Gemini)
- Fabricated "(Accessed February 2026)" suffix on 9 URLs (gem is
  non-agentic — cannot access)
- Got paper title slightly wrong (e.g. extra prefix)
- 8 of 9 cited URLs were nonetheless real (200 OK on HTTP HEAD)

**Hypothesis**: with thinking budget at API default (Gemini 3.5
Flash dynamic default can collapse to 0 thinking tokens for cost),
the model goes fast/shallow and over-relies on training-data
shortcuts. Setting `thinkingConfig.thinkingBudget` higher might
improve nuance but adds latency + cost.

**Questions to answer**:
1. What IS the API default for `thinkingBudget` on gemini-3.5-flash?
   Cite Google's official documentation.
2. What's the cost/latency curve for different thinkingBudget values?
3. For a fast-fan-out daily-driver helper (gem is called dozens of
   times per session), what policy is best:
   - (a) Leave at default (status quo)
   - (b) Always set `thinkingBudget: -1` (dynamic, "I trust the model")
   - (c) Set explicit budget (e.g. 4096) for quality floor
   - (d) Per-call override via env: `GEM_THINKING=4096 gem ...`
4. Does the answer change for `gemini-3.5-flash-lite` (which DOES
   default to 0 thinking)?

---

## Bug B: enforce-bridge.sh blocks editing .claude/brainstorm files

**Current design** (.claude/hooks/enforce-bridge.sh, lines 119-296):
- PreToolUse hook on Read|Bash
- Blocks reads of `.claude/brainstorm/*` files > 4KB
- Edit-mode marker `.claude/.scope-memo-edit-mode` exempts ONLY
  `docs/scope-memos`, not `.claude/brainstorm`
- Bash reader commands (`cat`, `head`, `grep`, etc.) also blocked

**Symptom** observed today: after compaction, agent cannot edit
existing brainstorm decision files because:
- Read tool → blocked by hook
- Edit tool → requires prior Read (which is blocked)
- Write tool → also requires prior Read (we tested 2026-05-22)
- Marker doesn't apply to brainstorm

**Workarounds tried (none clean)**:
- Touch `.scope-memo-edit-mode` → no effect (wrong path scope)
- Direct Write → "File has not been read yet" error
- Use `cat > file <<EOF` heredoc → not yet tested; redirect targets
  ARE stripped from path-scan per hook line 283

**Questions to answer**:
1. What's the design intent of having `docs/scope-memos` have an
   edit-mode marker but `.claude/brainstorm` not? Is this an
   oversight or deliberate?
2. Should the marker be extended to brainstorm? Or should brainstorm
   have its own marker? Or should the marker scope be broader (e.g.
   "any analysis path during this marker's lifetime")?
3. Alternative designs:
   - (a) Extend marker to cover both paths
   - (b) Add per-file edit override (touch
     `.claude/brainstorm/.foo-edit-mode` to allow editing `foo`)
   - (c) Track "files already-read-this-session" client-side and
     allow Edit if file was read once (even pre-compaction)
   - (d) Document the bridge-based read-then-Write pattern:
     `extract` enough to reconstruct, then `cat > file <<EOF`
4. What's the right policy for Edit tool's read-first requirement
   conflicting with hook-blocked reads? Does the harness need
   per-tool override? Or is the hook design too strict?

---

## Output shape (BOTH bugs, ≤800 words total)

For EACH bug:
- **Diagnosis** (1-2 sentences): what's the root cause / intent
- **Source evidence**: 2-3 cited URLs or file paths you actually
  examined (NOT training-data recall)
- **Recommendation** (one of the listed options OR a 5th you
  invent — be specific)
- **Trade-off** (1 sentence): what does your recommendation cost

End with **one line each**:
- Your self-bias note (family overlap with question subject — e.g.
  Gemini voice on Gemini-config question)
- "MY VOTE: A=<choice>, B=<choice>" — concrete answer choice

Hard constraint: real URLs only. NOT FOUND if you can't verify.
