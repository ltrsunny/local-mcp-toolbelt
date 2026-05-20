# Commit discipline

**Rule (Auditor-approved 2026-05-12):** every commit is either a
**product** commit or a **dev-meta** commit, never both. One commit, one
intent. This keeps release notes / `git bisect` / future archaeology clean.

## Two kinds of commits

### Product commits — "user-facing change to the toolbelt"

What the npm-installable `local-mcp-toolbelt` package actually does.
Touches:

- `packages/core/src/**` (any source code)
- `packages/core/package.json` (version bump, deps)
- Root `README.md` (user-facing instructions)
- `packages/core/README.md`
- `CHANGELOG.md` (user-visible entries)
- `LICENSE`, `NOTICE`
- `.github/workflows/**` (CI is product surface)

Prefix conventions:

| Prefix | Use for |
|---|---|
| `feat:` | New user-facing feature or tool |
| `fix:` | Bug fix the user can observe |
| `release:` | Version bump + CHANGELOG entry consolidation |
| `chore:` | Build / deps / lint upkeep |
| `perf:` | Measurable speedup |
| `refactor:` | Code reshape without behavior change |
| `revert:` | Undo of an earlier commit |

### Dev-meta commits — "how we work on the toolbelt"

Decision records, brainstorms, evals, diagnostics, project conventions.
Touches:

- `.claude/**` (brainstorm raw, diagnostics, hooks, prompts)
- `docs/notes/**` (eval data, stability findings, post-mortems)
- `docs/scope-memos/**` (feature scope memos, decision records)
- `docs/prior-art/**` (PA Review candidates)
- `docs/process/**` (this kind of doc)
- `CLAUDE.md` (project conventions, only useful to Claude/devs)
- `CONTRIBUTING.md` (only useful to devs)

Prefix conventions:

| Prefix | Use for |
|---|---|
| `meta:` | Generic dev-meta with no sub-kind |
| `meta(brainstorm):` | R1/R2 fan-outs, multi-AI deliberation artifacts |
| `meta(scope):` | Scope memos, Draft N, Auditor pass results |
| `meta(eval):` | Eval runs, judge outputs, report markdown |
| `meta(diag):` | Diagnostics, crash reports, upstream-issue drafts |
| `meta(pa):` | Prior Art Review candidates and surveys |
| `meta(process):` | Process / convention changes (like this file) |

## Mixed feature work

A new feature usually starts as dev-meta (scope memo, brainstorm,
PA Review) and ends as product (implementation + tests + CHANGELOG).
Split into AT LEAST two commits:

1. `meta(scope): vX.Y feature-name Draft N` — the decision doc
2. `feat: implement feature-name` — the code

Never roll the scope memo into the implementation commit, even if
both land in the same PR.

## Release-notes hygiene

The release notes for a version are the **product** commits since the
last release. Dev-meta commits do NOT appear in user-facing CHANGELOG
entries.

A quick scan of product-only history:

```bash
git log --oneline | grep -Ev "^[a-f0-9]+ meta(\(|:)"
```

Or install the project-local aliases once and use the short form:

```bash
npm run install-aliases   # writes alias.product-log and alias.meta-log
git product-log -n 20     # product commits only
git meta-log -n 20        # dev-meta commits only
```

The aliases are stored in `.git/config` (local, not user-global) so they
don't leak into other projects. Re-running `install-aliases` is
idempotent.

## Why this matters (in our specific context)

This project's delivery target is "an effective, out-of-the-box,
token-saving toolbelt for MCP clients." Everything that helps US work
on the toolbelt more efficiently — brainstorm raw, scope memos, eval
data, diagnostics, project conventions — is real and worth keeping,
but it is NOT the delivery. Mixing the two in one commit makes the
delivery story unreadable.

## Retroactive policy

Commits before this rule was approved (2026-05-12, ≤ commit 84eabad)
are NOT rebased. Going forward only. Bisect across the pre-rule range
will hit some mixed commits — acceptable cost of a one-shot
forward-only policy switch.

## Why we don't physically separate (logical > physical)

2026-05-18 review: the v0.6.0 dev cycle landed ~74% `meta(*):` commits
on main. PM (Auditor) asked whether main should be physically
product-only (separate `dev-meta` branch + force-push rewrite). After
a 2-round 3-voice adversarial brainstorm (see
`.claude/brainstorm/commit-history-hygiene-decision-2026-05-18.md`),
we decided **no**:

- Force-push rewrites tag SHAs (e.g. `v0.6.0`), breaking
  `npm install github:...#v0.6.0` style pins, CI provenance keyed on
  SHA, and security audits referencing old hashes
- `git-filter-repo --force` is irreversible; fork/PR rebases become
  hostile
- A CI gate that rejects `^meta:` on main would ossify the prefix
  convention prematurely — this doc changed 3× in 2 weeks
- The maintainer-audience filter is solved by the two git aliases
  above; nothing in the user-audience (CHANGELOG-readers, npm
  installers) is improved by physical separation

**Re-evaluation triggers**: revisit physical separation if fork count
> 10, or v1.0 nears with stricter tag immutability needs, or
meta-commit volume stays > 80% on main for 3+ months with reader
complaints.

## Historical note

The rule was adopted after a 2026-05-12 review where the user
(Auditor) observed that 4 of the 7 commits in the v0.5.1 → v0.6.0
brainstorm cycle were dev-meta dressed as `docs(*):` and could be
mistaken for release artifacts. The split above eliminates that
ambiguity by making the kind explicit in the prefix.
