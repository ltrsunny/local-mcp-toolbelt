# Brief: commit history hygiene — does meta(*) belong on main? (cross-challenge)

You are one of 4 voices doing cross-challenge adversarial brainstorm.
You will pick a preferred option, **attack the strongest competing
option explicitly**, and propose a D/E/F if you see one. Output
200-400 words.

## Problem

`local-mcp-toolbelt` follows `docs/process/commit-discipline.md` —
prefix-based separation between **product** (`feat/fix/release/
chore`) and **dev-meta** (`meta(*):`) commits. Both share `main`.

Today's session: **17 meta + 3 feat + 2 chore + 1 release = 23
commits, 74% meta on main**. PM observed: "似乎不符合'只记录产品
更迭的'分离原则".

Two readings of "分离":

- **Doc's read** (logical separation): prefix labels + filter
  commands. `CHANGELOG.md` is curated product-only view.
- **PM's read** (physical separation): main should be product-only;
  meta lives elsewhere (separate branch/repo).

## 3 options on the table

### (A) Keep history; add docs + conventions

- Doc clarifies "main contains both; CHANGELOG is the curated
  view"
- README points users at: CHANGELOG for releases, `git log --grep
  -Ev "^meta"` for product-only
- Zero history rewrite
- Loses nothing; just educates readers

### (B) Move meta(*) to a separate branch `dev-meta`

- cherry-pick all past meta(*) commits → `dev-meta` branch
- `git reset` main to product-only
- Force-push main (history rewrite)
- Clean main, meta history preserved separately
- **Invasive**: every fork/clone breaks; v0.6.0 tag commit moves

### (C) Stop committing `.claude/brainstorm/*` entirely

- gitignore `.claude/brainstorm/`
- Future audits stay local-only on dev machine
- Loses cross-session decision archaeology (e.g. today's 5-voice
  steelman reversal of 4-voice consensus would be gone forever)
- Smaller main forward, but **kills the project's distinctive
  decision-trace value**

## Synthesizer's preferred = (A)

Reasoning:

- CHANGELOG already provides the product-only view for users
- Today's meta chain has decision-trace value (5-voice reversal,
  NIM tier scrape, etc.) — useful archaeology
- Force-push for (B) breaks forks; not free
- (C) loses the trace permanently

But the PM rejected the synthesizer's pick and asked for adversarial
challenge. **Don't just rubber-stamp (A).**

## Your task

1. **Pick your preferred option** (A / B / C / propose D/E/F).
2. **Attack the strongest competing option explicitly** — name what
   it gets wrong, not just "I prefer mine".
3. **Propose a concrete refinement to your pick** (1-2 sentences):
   e.g. if you pick (A), what specific README line; if (B), what
   migration script.
4. **Spot a flaw in the synthesizer's framing** if you see one.

Push back hard. The synthesizer leaned (A) on convenience grounds
without enough adversarial pressure — that's exactly when consensus-
based shortcut fails. Several real risks the synthesizer downplayed:

- "CHANGELOG covers it" — but contributors searching by `git log`
  on a feature still see all the meta noise
- "Force-push breaks forks" — this project has near-zero forks
  today; cost is small now, big later
- "Decision-trace has value" — true, but the value is for THIS
  dev's mental model; could live in a notes repo, blog, docs/

Output: comment body only, no preamble.
