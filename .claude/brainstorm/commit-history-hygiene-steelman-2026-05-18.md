# Steelman: defend (A) keep-history against unanimous (B) push

## Context

4 voices (copilot/llama-3.1-70b/mistral-nemotron/gem) all picked (B)
move-meta-to-dev-meta-branch in cross-challenge round. Unanimous
consensus on a procedural decision triggers our STEELMAN protocol
(memory: "unanimous-consensus ≠ correct", "audit framing not just
options").

The original brief was framed adversarially against (A) — synthesizer
"leaned (A) on convenience grounds without enough adversarial
pressure". That framing pre-primed all voices to attack A.

## Your task: steelman (A) — keep history + add docs

You are the adversarial voice **defending (A)** against the (B)
consensus. Push back HARD on every (B) refinement that came back.

### (B) refinements the 4-voice consensus proposed
- copilot: `git-filter-repo` migration script + ref-map + backup
  branch + force-push + CI check rejecting `^meta:` on main +
  GitHub Action that on push-to-dev-meta appends curated CHANGELOG
- llama-3.1-70b: cherry-pick script + main reset + CHANGELOG update
- mistral-nemotron: `git log --grep -v '^meta' | git cherry-pick -x`
  + pre-commit hook rejecting meta on main
- gem: pending

### Real risks (B) consensus downplayed
1. **Force-push rewrites v0.6.0 tag SHA.** Anyone who `npm install
   github:...#v0.6.0` or `git clone --branch v0.6.0` post-rewrite
   gets a different tree-hash. tag is the immutable contract; moving
   it breaks downstream pinning.
2. **PR/issue commit references rot.** Any `#123 fixed in
   abc1234` link in past PR threads, issue comments, or external
   blog posts points to dead SHAs after rewrite. Permanent
   archaeology lost — exactly the value the 4-voice claimed to
   preserve.
3. **`git-filter-repo` requires `--force` and warns about not
   running on production repos.** This is not a small operation
   for the single-maintainer-low-fork case; it's a small
   operation for a clean-history-mattering case. Today is the
   former, not the latter.
4. **CI check `reject ^meta: on main`** assumes commit prefixes
   stay stable forever. The doc evolved 3 times in 2 weeks
   (commit-discipline.md history). Hard gating ossifies the
   convention prematurely.
5. **GitHub Action auto-CHANGELOG from dev-meta** doubles the
   surface: now meta lives in branch + curated section, with
   sync drift as a new failure mode. CHANGELOG.md is already
   manually curated (current discipline works).
6. **The 4-voice never priced "who actually reads `git log` on
   main".** Almost nobody on a 0-fork project. The audience is
   the maintainer (me, with grep aliases) + future contributors
   (who arrive via README, not raw `git log`).

### Required response shape

1. **Defend (A) explicitly.** Not "I prefer A on balance" — say
   why (B) is actively wrong for THIS project at THIS stage.
2. **Demolish at least 2 of the 6 (B) refinements** above with
   concrete failure modes.
3. **Propose a stronger (A+) refinement**: what specific README
   line + grep alias + git config local-aliases would make
   filtering frictionless for the maintainer-audience.
4. **Spot the framing bias** that pushed all 4 voices toward B.
   (Hint: the original brief listed B's downsides as bullet
   points but A's downsides only as "loses nothing" — asymmetric
   risk presentation.)

200-400 words. Comment body only. Be aggressive — this is the
counter-balance to a 4-way pile-on.
