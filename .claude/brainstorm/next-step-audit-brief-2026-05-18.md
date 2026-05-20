# Brief: audit the 4 "next step" options I just framed (and the framing itself)

You are auditing a meta-decision in `local-mcp-toolbelt` v0.7+ prep.
PM just caught that the synthesizer (Claude) was hiding behind a
fake "blocked on chip action" framing. After honestly admitting
nothing is structurally blocked, the synthesizer offered 4 options
without first running them through audit — same failure mode that
the PA chips just caught (commit `2490e4c`).

Output 200-400 words. Verdict on each option + verdict on the
framing itself + a single recommendation. Push back hard.

## State

`local-mcp-toolbelt` v0.6.0 shipped today (`f0cc75c`, tag `v0.6.0`).
v0.7+ scope memo (`docs/scope-memos/v0.7.0-install-2026-05-15.md`)
is Draft 0. 4 task chips were spawned earlier today: 1 macOS 26 +
AFM spike (still pending user click) + 3 PA chips (audit-rejected,
user is expected to dismiss).

22 commits already today. Auditor-protocol memory file has 4
anti-patterns including the just-added "chip brief = design
artefact, must audit before spawn".

## The 4 options offered

1. **In-session PA research** — synthesizer does PA work directly
   (1 unified install+hook PA + 1 model fetching PA, 3-5 dims per
   audit consensus). Replaces the dismissed PA chips.
2. **Skip PA, write Draft 1** from current knowledge, audit Draft 1.
   PA-first workflow was one of the things 2/3 voices in the last
   audit said REVISE.
3. **In-session macOS 26 + AFM research** — synthesizer does it,
   not the chip.
4. **Hybrid in-session**: macOS 26 + AFM research first (30 min),
   then design redesigned PA briefs based on findings, then decide
   whether to in-session PA or spawn redesigned chips.

## Framing problems I want you to push back on

1. **All 4 options assume "do it now"** — none propose "wait until
   tomorrow with rested judgment". Today has been 22 commits +
   multiple audit cycles. Is exhaustion making framing worse?
2. **All 4 assume in-session over chip** — none propose "trust the
   async delegation, click chips, walk away".
3. **None propose "step away from v0.7+"** — e.g. do a v0.6.x
   patch on the residual stale-doc cleanup, or pure rest.
4. **None propose "refine the v0.7.0 scope memo itself"** based on
   today's learnings before committing to a next-step shape — the
   memo is still Draft 0; maybe iterate it before deciding what
   research it needs.
5. **None propose "audit the just-landed auditor-protocol memory
   edit"** for the 4th anti-pattern — the synthesizer wrote it
   without audit too.
6. **The phrase "do PA research myself" assumes PA is necessary** —
   feature-intake-rule says it is, but maybe today's learning
   ("framing > options") means we should question even that.

## Your task

Verdict per option (1/2/3/4: SHIP / REVISE / KILL).
Verdict on the framing (6 issues above: which are real catches,
which are over-reach).
Single recommendation: what should the synthesizer do next?

Be terse. Push back if you spot a 5th option that beats all 4.
Output comment body only, no preamble.
