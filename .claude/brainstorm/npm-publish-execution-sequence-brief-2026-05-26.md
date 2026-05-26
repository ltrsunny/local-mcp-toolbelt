# Brief: adversarial review of npm publish + plugin marketplace execution sequence

You are 1 of N voices reviewing a PROPOSED execution sequence for
shipping `local-mcp-toolbelt` to npm + claude-community plugin
marketplace. Synthesizer drafted the sequence below WITHOUT review;
this brief fixes that. Find what's wrong / missing / out of order.

Per #21 (Citation ≠ Evidence): label every load-bearing claim as
EMPIRICAL (verified via real fetch/test) or CITED-UNVERIFIED. Do NOT
self-label EMPIRICAL on things you can't actually run/fetch.

Per #22 (Brief framing seeds woozle): the synthesizer's sequence
below is one proposed framing — challenge premises freely.

## Context (EMPIRICAL — verified this session 2026-05-25/26)

- `local-mcp-toolbelt@0.6.0` in `packages/core/package.json`. `bin`
  field is `{"local-mcp": "./dist/bin/cli.js"}` (binary name is
  `local-mcp`, NOT `local-mcp-toolbelt`).
- `npm view local-mcp-toolbelt` returns 404 — never published.
- `npm whoami` returns ENEEDAUTH — user must `npm login` first.
- `dist/` is gitignored (`.gitignore` line 2). Therefore plugin
  marketplace install via GitHub source clones a repo WITHOUT
  `dist/`, breaking any MCP server config that references
  `${CLAUDE_PLUGIN_ROOT}/packages/core/dist/...`.
- Plugin PoC committed in 3e0d18b + 02760c5 with `.mcp.json` using
  absolute path `/Users/rd/ollama-claude/...` (machine-specific).
- 4-voice distribution-vetting fan-out (this session) verdict:
  A+B parallel (plugin marketplace + npm publish). Audience
  narrowed by user to "Claude Code community" (not cross-MCP-client).
- package.json `repository.url` = `git+https://github.com/ltrsunny/local-mcp-toolbelt.git`
  — but EMPIRICALLY NOT YET VERIFIED whether this GitHub repo
  exists, is public, and has up-to-date code.
- package.json `keywords` includes `cursor, cline, zed` — written
  when audience was assumed cross-client; now audience is
  Claude-Code-community only.

## Proposed 6-step execution sequence (the thing under review)

1. `npm login` (user action, credentials)
2. `npm publish` of v0.6.0 (synthesizer-run after explicit confirm)
3. Edit `.mcp.json`: replace absolute path with `npx local-mcp serve`
4. Edit `.claude-plugin/marketplace.json`: change `"source": "./"` →
   `{"source": "github", "repo": "ltrsunny/local-mcp-toolbelt"}`
5. CHANGELOG: leave 0.6.0 entry; OR add 0.6.1 entry; OR bump 0.7.0
   (synthesizer didn't decide)
6. (later session) Submit to claude-community via
   `claude.ai/settings/plugins/submit`

## Open questions the synthesizer didn't think through

### Q1 — Version choice
0.6.0 (CHANGELOG entry exists, no new functional change) vs 0.6.1
(reflects "first ship" but trivially semver-bumped) vs 0.7.0 (aligns
with the in-flight v0.7 scope memo but no functional change yet).

### Q2 — GitHub repo state
Does `github.com/ltrsunny/local-mcp-toolbelt` actually exist? Is it
current (matches local repo state)? Was it pushed today/recently?
**Verify before relying on it**. If empty / stale / private, plugin
marketplace github source breaks.

### Q3 — Order: npm publish vs GitHub push
After `git push origin main` (if needed), npm publish, OR npm publish
first then GitHub catches up? Which side serves traffic to plugin
install clients?

### Q4 — Plugin marketplace source switch timing
When to change `"source": "./"` to github form: BEFORE submission to
claude-community (required) but also: should current local-marketplace
install (already done this session) survive the source change? Will
`claude plugin marketplace update local-mcp-toolbelt-marketplace`
pick up the github URL change or break?

### Q5 — Empirical test of "fresh-user installs from community"
Currently NO test path exists for "open Claude Code on a clean
machine, run `/plugin install local-mcp-toolbelt@claude-community`,
bridge works". How can we test BEFORE pushing to community? A second
machine? A docker container? A sister Claude Code session in a
temp dir?

### Q6 — Rollback policy
npm publish is **permanent within 72 hours** then `unpublish` blocked
without coordination. If 0.6.0 ships with bug, what's the fix-forward
strategy? Bump to 0.6.1 immediately?

### Q7 — Community marketplace rejection
agy_pro earlier flagged "automated screening + may reject". What
happens to our distribution if Anthropic rejects? Backup channels?

### Q8 — package.json keywords mismatch
`cursor, cline, zed` in keywords now mismatches "Claude Code community"
audience. Keep (cast wider net, npm search finds package for those
users too) or remove (clarity, focused product)?

### Q9 — Anything synthesizer missed?
Find it.

## Output shape (≤700 words)

For each Q1-Q9:
- **Position**: concrete answer / recommendation
- **EMPIRICAL/CITED-UNVERIFIED label** on each load-bearing claim
- **Confidence**: solid / weak / NOT FOUND

End with:
- **Top 2 risks of synthesizer's 6-step sequence as written**
- **Proposed revised sequence** (if needed) — concrete steps
- **What to test BEFORE running `npm publish`** (gate condition)
- **Self-bias note**

## Anti-woozle reminder

Today's earlier fan-out had voices self-label EMPIRICAL on
fabricated content. Some claims here REQUIRE real web/git access
(Q2 — verify ltrsunny GitHub repo state). If you can't actually
verify it, mark CITED-UNVERIFIED.

For npm-publish specifics (Q6, Q7), the actual npm/marketplace
policies need real docs check, NOT prior training-data recall.
