# Brief: Antigravity CLI integration — adopt, defer, reject, or partial?

You are one of 4 adversarial voices. Synthesizer (Claude) has a
tentative draft — challenge it.

## Today's verified evidence (5-axis inspection done; not speculation)

`agy` CLI v1.0.0 installed today. Auth via Google OAuth (Pro tier
on `ltrsunny@gmail.com` confirmed). All behaviors below tested via
Claude's Bash subprocess (not just docs claims):

1. **Models accessible (interactive `/model` menu, Pro user)**:
   - Gemini 3.5 Flash (High, Medium)
   - **Gemini 3.1 Pro (High, Low)** ← capacity-exhausted on
     gemini-cli all day, **works on Antigravity**
   - Claude Sonnet 4.6 (Thinking)
   - Claude Opus 4.6 (Thinking)
   - GPT-OSS 120B (Medium)

2. **Model selection is cloud-stored sticky per account.** No
   `--model` CLI flag exists (`agy --help` + all subcommand help
   exhaustively read). Switching requires interactive `/model`
   menu, persists across `agy -p` subprocess calls.

3. **`--conversation=<id>` resumes HISTORY only, NOT model state.**
   Verified: resumed a 3.1-Pro conversation while sticky was Claude
   Sonnet → got Sonnet's response, not 3.1-Pro's. **Per-conversation
   model is not preserved.** Implication: **all parallel `agy -p`
   calls use same current sticky → no parallel multi-model fan-out
   via agy alone.**

4. **6/18 implications**: agy uses `daily-cloudcode-pa.googleapis.com`
   endpoint (not gemini-cli's `cloudcode-pa.googleapis.com`).
   Different quota pool. Antigravity is the OFFICIAL gemini-cli
   migration target per Google docs. Survives 6/18.

5. **Workspace context**: `/Users/rd` is in trustedWorkspaces. agy
   can read project files in cwd (less aggressive than gemini-cli
   per our test — answer was generic "MCP servers" not specific
   CLAUDE.md phrases) but not zero.

## Synthesizer's draft conclusion (CHALLENGE THIS)

> "Antigravity adds 1 sticky agentic voice with switchable identity.
> Fills the 'agentic + Pro + post-6/18' niche but does NOT
> structurally expand fan-out diversity (still single-model per
> account at any moment). `ghm` (GitHub Models, 4 family parallel
> with 8K cap) remains the fan-out backbone. Recommended: light
> integration — keep `agy` available as a switchable voice, don't
> replace existing portfolio voices."

## Five candidate strategies (matched-form)

| ID | Action | Replaces |
|---|---|---|
| **A** Full adoption | Replace `gem-pro` with `agy` now (sticky on Gemini 3.1 Pro); deprecate gem-pro pre-6/18 | gem-pro |
| **B** 6/18 standby | Keep gem-pro primary; agy only after 6/18 cutoff | nothing now |
| **C** Composite (synth draft) | agy = switchable Pro voice; ghm fan-out backbone; gem-pro until 6/18; copilot-free for free agentic | nothing |
| **D** Multi-account agy | Install agy on multiple machines / accounts, each with different sticky → parallel multi-model fan-out via independent CLI instances | Hardware multiplier |
| **E** Reject agy | Single-sticky limit kills value; existing ghm + copilot-free already cover agentic+free+post-6/18 — focus on those | agy uninstalled |

## Your task

1. **Pick A-E or F/G**.
2. **Attack the strongest competitor**: concrete failure mode tied
   to today's evidence (not general philosophy).
3. **Verify or refute one claim** in this brief (specifically:
   "per-conversation model is not preserved" — does Antigravity
   docs you know of say otherwise? "different quota pool" — really?
   "no `--model` CLI flag" — sure agy's plugin system or 1.x roadmap
   doesn't add it?).
4. **Spot framing flaw**: what's the synth missing? (Likely candidates
   to seed: cost of switching daily, security implications of `/Users/rd`
   trustedWorkspace, IDE 2.0 vs CLI feature parity, multi-account
   feasibility on user's actual hardware, etc.)
5. **Self-bias note**: if your family is Google or Anthropic, disclose
   pro-ecosystem lean.

200-400 words. Comment body only. Be specific.
