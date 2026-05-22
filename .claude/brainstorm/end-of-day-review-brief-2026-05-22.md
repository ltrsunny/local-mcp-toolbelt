# Brief: end-of-day adversarial review of all 2026-05-22 work

You are one of 3 voices doing a critical end-of-day review. The
session lasted ~6 hours and produced 3 distinct work units (Bug B,
Bug C, Bug A) plus an anti-hallucination decision and 3 proposed
new anti-pattern entries. PM wants to know: **what should we
revise, redesign, or revert before commit?**

Hard constraint: cite real evidence (file paths, code lines,
empirical observations). Don't invent failure modes. If you don't
have evidence, say "I have no evidence for X but suspect Y because Z".

## Today's work units

### Unit 1: Anti-hallucination 5-rule decision (committed c07148d)
- 5 operational rules: HTTP HEAD URL verification, schema-constrained
  cited_urls, NOT FOUND preflight, CoVe, info-asymmetric audit
- 3 voices participated in original fan-out (Claude/agy_pro/nemotron),
  gem added 2026-05-22 to fix silent-exclusion
- 3 proposed new anti-patterns for auditor-protocol.md:
  (1) trusting cited URLs without HTTP verify
  (2) trusting voice's self-identity claim
  (3) reflexive voice-tally trimming (#17 self-application)

### Unit 2: Bug B fix (committed c07148d)
- Renamed `.scope-memo-edit-mode` → `.bridge-edit-mode`
- When present, ALL analysis paths exempt (was: docs/scope-memos only)
- 60-min mtime auto-expire (configurable via OMCP_HOOK_MARKER_EXPIRE_SEC)
- Implementation: .claude/hooks/enforce-bridge.sh lines 95-110 + 226-233
- emit_analysis_block hint moved out of scope-memos-only conditional

### Unit 3: Bug C — ghm dynamic picker (helpers.sh, out of tree)
- New `_ghm_pick_model <tier> [min_context]` — fetches /catalog/models
  on every call, filters by rate_limit_tier + context, pings, returns
  first healthy
- ghm = low tier (16/min·150/day), ghm_pro = high tier (10/min·50/day)
- GHM_MODEL env override REMOVED (iron rule)
- Tier-based max_tokens (600/4000, mirrors nv_sum/nv_pro)
- Non-JSON response detection (catches GHM proxy rate-limit text body)
- `custom` tier (gpt-5/o-series/deepseek-r1 reasoning) DEFERRED to
  future `ghm_reason` function

### Unit 4: Bug A — gem thinkingConfig (helpers.sh, out of tree)
- Added explicit `generationConfig.thinkingConfig.thinkingBudget` to body
- GEM_THINKING env override (-1 default dynamic, 0 disable, N explicit)
- Docstring warning added: "agent-style long briefs trigger role-play
  hallucination — use gem-pro/agy_pro/Claude WebSearch for those"
- Empirical 4-run probe 2026-05-22 confirmed thinkingConfig is NOT
  the gem hallucination root cause (default ALREADY uses ~500-700
  thoughts tokens) — fix is mostly cosmetic + docstring

## Review questions

1. **Bug B — marker auto-expire 60min**: is the default sane? What if
   user actively edits for 70 minutes straight? Should marker mtime
   refresh on access (touch on every block-bypass)? Or is "manual
   re-touch" friction acceptable?

2. **Bug C — tier split (low/high) without custom**: defensible to
   defer custom tier (reasoning models)? Or did we leave a real gap?
   Specifically: when SHOULD a user reach for reasoning models vs
   gpt-4o-style frontier? If unclear, the deferral is concerning.

3. **Bug C — context filter from byte/4 estimate**: prompt+stdin
   bytes/4 + 256 margin. Acceptable for English; fails for CJK
   (more bytes per token). Real concern or premature optimization?

4. **Bug A — docstring warning vs structural fix**: we documented
   "don't use gem for long agentic briefs" but the function itself
   STILL ACCEPTS such prompts. Should gem refuse / re-route? Or is
   a docstring all that's appropriate?

5. **Anti-hallucination Rule 1 (HTTP HEAD) — 403 ambiguity**: we
   acknowledged Cloudflare-protected hosts return 403 to bare curl.
   Did we provide a clear escape hatch? Should the rule include
   "if 403, escalate to Playwright/browser verification" as an
   explicit step, or just flag for human?

6. **3 proposed new anti-patterns**: do they overlap with existing
   #17 (reflexive omission)? Specifically, anti-pattern #3 ("reflexive
   voice-tally trim") is #17 self-applied. Is that worth its own
   entry, or should #17 just gain a "self-application included"
   clause?

7. **Process / session shape**: today went B → C → A. Justified by
   "B blocked all file edits, urgent". But: could B + C have been
   parallel (different files)? Did sequential cost time without
   benefit?

8. **Was anything missed?** Skim the work units above. Anything
   that should also be in scope today but wasn't? Anything that
   looks like over-engineering (premature abstraction, extra
   features that aren't load-bearing)?

## Output shape (≤900 words)

For each review question, ONE of:
- **Sound**: the design holds. State why in 1 sentence.
- **Revise**: specific tweak before commit. State what + why.
- **Redesign**: load-bearing concern. State what's broken + alternative.
- **No evidence**: can't assess without more data. State what's missing.

End with:
- **Self-bias note**: family overlap on any question
- **Top 2 concerns** ranked by leverage
- **MY VERDICT**: COMMIT-AS-IS / COMMIT-WITH-TWEAKS / HOLD-FOR-REDESIGN

Hard constraint: real evidence only. If you cannot verify, say so.
