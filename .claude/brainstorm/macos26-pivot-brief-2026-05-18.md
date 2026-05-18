# Brief: macOS 26 upgrade + v0.6.0 release timing — pivot or proceed?

You are auditing a small-but-consequential timing decision in
`local-mcp-toolbelt` v0.6.0 release prep. Output 250-400 words. End
with one explicit option recommendation (A / B / C / propose D). No
preamble. Push back on framing if you spot a flaw.

## Today's state (2026-05-18)

This session has done ~14 commits of v0.6.0 work:

- Day 4: deprecation flags on v0.3.0 triad + CHANGELOG draft
- Day 4-5: H behavioural unit test (boundary propagation of
  per-tool thinking-mode defaults); F (programmatic scorer) was
  rejected as a category error against v0.6.0's plumbing-only
  changes via 5-round adversarial fan-out
- Day 5: **Tier D (Qwen3-14B-4bit) demoted to power-user opt-in**
  on 16 GB Mac target hardware. Justified by:
  - 4-bit 14B (~7-8 GB resident) + `hot_cache_max_size=6GB` →
    Metal OOM observed today
    (`kIOGPUCommandBufferCallbackErrorOutOfMemory`)
  - 5-voice fan-out 0/4 reliable votes to keep as default
  - 3 audit rounds on the demotion diff
- Procedural commits: NIM dynamic discovery, hook product-ization,
  scope memo §1.1/§1.2

Just-finished pre-release work:

- `packages/core/scripts/cross-client-smoke.mjs` — real stdio
  MCP transport smoke (12 tools, initialize, check_progress).
  PASSED.
- Version bumps 0.5.1→0.6.0 in package.json + cli.ts + server.ts.
- CHANGELOG.md TBD→2026-05-18.
- check-version-sync.mjs passes; 207/207 unit tests pass.
- Dual-voice release audit (ministral + gem-3.1-pro): **2/2 SHIP**.

Outstanding mid-step: `~/.config/claude-dev/helpers.sh` `gem`
function lacks a wall-clock timeout — a Gemini-API transient stall
today caused a 12-min silent hang (process alive, 0.12 s CPU, no
output, no fallback). Patch ready to land (perl-alarm wrapper +
return 2 on SIGALRM so fallback chain triggers).

## The pivot

User just reported: **upgraded to macOS 26 (Tahoe)** on the dev /
target machine. Two implications:

1. **Tier D demotion data is from macOS 25 (Sequoia).** The Metal
   command-buffer accounting that triggered today's OOM may have
   changed in 26. The demotion may now be over-cautious for this
   specific hardware — but we have **zero** macOS 26 data.

2. **Apple Foundation Models framework** ships on-device 3B LLM
   accessible via system API. This is a potential v0.7+ "Tier A"
   no-setup default, partially or wholly displacing oMLX for some
   workloads. We have **no concrete API research** yet.

## Options

- **A. Finish gem fix + ship v0.6.0 as-is.** Tier D demotion stands
  on the macOS 25 evidence we have. Caveat: macOS 26 may relax the
  constraint; revisit in v0.7+ if dogfood shows pressure to
  re-promote.
- **B. Pause release.** Spend 30-60 min on macOS 26 research:
  re-test Tier D Metal accounting; investigate Foundation Models
  accessibility from Node bridge. Then decide on release timing.
- **C. Ship v0.6.0 with explicit macOS-25 caveat in the release
  commit message** ("Tier D demotion observation on macOS 25;
  re-evaluate on macOS 26 in v0.7+"). Queue macOS 26 work as a
  scope-memo candidate for v0.7+ alongside the `omcp install-hooks`
  product feature already in the queue.

## Tensions to weigh

1. **Sunk vs. forward cost**: 14 commits + dual-voice audit are
   ready to ship. Holding release for unverified macOS 26 deltas
   risks scope creep (Foundation Models is its own product
   question, not a Tier D revisit).
2. **Decision durability**: Tier D demotion is reversible (code
   path + opt-in remain). A future v0.7+ re-promotion under macOS
   26 evidence costs nothing today.
3. **PM context**: same PM has *repeatedly* pushed back on lazy
   shortcuts AND on scope-pivot loss. Both pressures apply here.

## Your task

Pick ONE option. Reason in 100-200 words. Push back on the framing
if any of the 3 options sneaks in a faulty premise. Output:
comment body only, no preamble.
