# Decision: commit history hygiene — keep history (A+), reject branch split (B)

Date: 2026-05-18
Trigger: PM challenge "74% meta on main 似乎不符合'只记录产品更迭'分离原则"
Process: 2-round adversarial fan-out (3+3 voices, bridge-extracted)

## Decision

**A+ (refined keep-history). Reject B (separate branch).**

## Process — what happened

### Round 1 (attack A, favor B)
- copilot, llama-3.1-70b, mistral-nemotron — all picked B
- gem hung 10+ min (perl-alarm wrapper didn't fire in background subshell;
  killed manually)
- Convergence: B + git-filter-repo migration + CI `^meta:` gate

### Procedural trigger: unanimous → steelman protocol
Per memory anti-pattern "unanimous-consensus ≠ correct" + "audit framing
not just options". Also: original brief was framed adversarially against
synthesizer's (A) preference, asymmetric risk presentation
("A: loses nothing" vs "B: [bulleted downsides]").

### Round 2 (steelman A, attack B) — same 3 NIM voices on reversed brief
All 3 converged on:
1. **Force-push rewrites v0.6.0 tag SHA** → breaks any `npm install
   github:user/local-mcp-toolbelt#v0.6.0`, breaks CI provenance,
   invalidates security audits keyed on old SHAs
2. **`git-filter-repo --force` is irreversible** → fork/PR rebases
   become hostile; downstream branches must rewrite-or-die
3. **CI `reject ^meta:` ossifies a still-evolving convention** — the
   commit-discipline doc changed 3× in 2 weeks; hard-gating prefix
   format is premature
4. **README + git alias** is concrete enough to make filtering
   frictionless for the maintainer-audience (~0 forks today)

## Concrete actions (A+)

### 1. Two git aliases (project-local, not user-global)
```bash
git config --local alias.product-log "log --pretty=format:'%h %s' --invert-grep --grep='^meta'"
git config --local alias.meta-log "log --pretty=format:'%h %s' --grep='^meta'"
```

### 2. README addition (single section, ≤6 lines)
```markdown
## Commit log filtering

Main contains both product (`feat/fix/release/chore`) and dev-meta
(`meta(*):`) commits. **`CHANGELOG.md` is the curated product-only
view for users.** For raw git filtering during development:

- `git product-log` — product commits only
- `git meta-log`    — dev-meta commits only
- Setup once: `npm run install-aliases` (writes the aliases above)
```

### 3. One-shot bin/install-aliases.mjs script (~10 lines)
Idempotent: runs `git config --local alias.product-log` etc., guards
on existing values to avoid clobbering user customizations.

### 4. NO history rewrite. NO CI prefix gate. NO force-push.

## Re-evaluation triggers (when to revisit B)

A+ is correct **today**. Revisit B if any of:
- Fork count > 10 (contributors hitting raw `git log` directly)
- v1.0 nears and tag immutability needs SemVer-grade hygiene
- meta-commit volume on main exceeds CHANGELOG-readable threshold
  (e.g. >80% sustained over 3 months, plus complaints)

## What the synthesizer got wrong in the original brief

- Listed B's risks as detailed bullets ("invasive", "force-push breaks
  forks", "v0.6.0 tag moves") but compressed A's downsides to
  "loses nothing; just educates readers"
- This asymmetric framing pre-primed all 4 voices to attack A
- Result: Round 1 unanimous-B was a framing artefact, not an argument win
- Procedural learning (already in memory `auditor-protocol.md` anti-pattern
  list, reinforced here): when generating multi-option briefs, **list
  downsides in matched form** — same bullet count, same specificity
  level — or actively disclose the asymmetry to voices

## Files touched (next session)
- README.md — add Commit log filtering section
- packages/core/bin/install-aliases.mjs — new
- packages/core/package.json — add `install-aliases` script
- (later) Consider extending `omcp install` (v0.7+ scope) to invoke
  install-aliases automatically as a maintainer-side helper

## Voice logs
- `/Users/rd/ollama-claude/tmp/copilot-hygiene.log` (Round 1: B)
- `/Users/rd/ollama-claude/tmp/llama3-hygiene.log` (Round 1: B)
- `/Users/rd/ollama-claude/tmp/mistral-hygiene.log` (Round 1: B)
- `/Users/rd/ollama-claude/tmp/gem-hygiene.log` (Round 1: hung, 0 bytes)
- `/Users/rd/ollama-claude/tmp/copilot-A-defend.log` (Round 2: A+)
- `/Users/rd/ollama-claude/tmp/llama3-A-defend.log` (Round 2: A+)
- `/Users/rd/ollama-claude/tmp/mistral-A-defend.log` (Round 2: A+)
