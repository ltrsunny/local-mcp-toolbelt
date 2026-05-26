# Brief: deliver `local-mcp-toolbelt` as one-click Claude Code plugin

You are 1 of N voices designing the CONCRETE delivery plan to make
`local-mcp-toolbelt` a one-click installable Claude Code plugin —
**the actual产品形态**, replacing the current "npm + manual mcp add"
hack with marketplace-installable plugin.

Hard constraint per anti-pattern #21 (Citation ≠ Evidence, added
auditor-protocol.md 2026-05-22): every claim about Claude Code
plugin format / marketplace submission / MCP packaging MUST be
verified via real official docs (cite URLs you actually visited).
If you cannot verify, say **CITED-UNVERIFIED**. Do NOT recall from
training data and present as fact — this brief is specifically
about a product-shipping plan, hallucinated specs will mislead the
implementation team.

Per anti-pattern #22 (Brief framing pre-shapes voice convergence,
same date): facts below are tagged **EMPIRICAL** (verified today
in this session via real probing) / **ASSUMED** (carrying prior
trust). Voices should challenge ASSUMED facts.

## Goal

`local-mcp-toolbelt` (npm Apache-2.0 MCP server, v0.6.0 currently)
shipping as a Claude Code plugin such that any Claude Code user can:
1. Open Claude Code (Desktop or CLI)
2. Browse plugin marketplace
3. Click "install local-mcp-toolbelt"
4. Bridge MCP tools + enforce-bridge.sh hook auto-available
5. No `claude mcp add`, no manual settings.json edit, no terminal

## Known facts (EMPIRICAL, this session 2026-05-25)

- `claude --help` shows `claude mcp add -s user|project|local` subcommand
- `claude mcp add-from-claude-desktop` exists (imports MCP servers
  from Claude Desktop config)
- `claude mcp list` (in `~/ollama-claude/` cwd) returns "No MCP servers
  configured" — yet `mcp__local-mcp-toolbelt__extract` works in this
  session. Implication: bridge MCP is INJECTED by Claude Desktop's
  IPC mechanism, NOT registered via Claude Code's own MCP layer
- Claude Code uses `--plugin-dir` args (seen in `ps`): e.g.
  `~/Library/Application Support/Claude/local-agent-mode-sessions/.../skills-plugin/.../`
  and `.../rpm/plugin_<hash>/`
- Settings.json supports `enabledPlugins` field with `plugin@source`
  syntax; 3 known sources: `claude-code-marketplace`,
  `claude-plugins-official`, `builtin` (seen in update-config skill
  doc)
- Bridge MCP server is `node /Users/rd/ollama-claude/packages/core/dist/bin/cli.js serve` (from Claude Desktop config)
- bridge enforcement hook is a single bash file `enforce-bridge.sh`
  in `.claude/hooks/` (project-local)

## Known facts (ASSUMED, NOT yet verified)

- ASSUMED: plugin manifest format / packaging schema is documented
  by Anthropic
- ASSUMED: plugins can declaratively bundle MCP server registrations
- ASSUMED: plugins can declaratively bundle PreToolUse hooks
- ASSUMED: `claude-code-marketplace` is open for community submissions
  (vs invite-only)
- ASSUMED: marketplace submission process is reasonably documented
- ASSUMED: plugin install auto-registers MCP server at appropriate
  scope (user-level for ubiquity)

## Research priorities (DO REAL WEB SEARCH)

Try these URL patterns FIRST (don't recall from training):
- `docs.claude.com/en/docs/claude-code/plugins`
- `docs.claude.com/en/docs/claude-code/mcp`
- `github.com/anthropics/claude-code/...` (if open repo exists)
- `github.com/anthropics/claude-plugins-official`
- Claude Code plugin marketplace if there's a web frontend

## Design questions

### Q1 — Plugin packaging format
What's the file structure of a Claude Code plugin package? Manifest
schema (JSON / YAML)? Required vs optional fields? Cite real docs.

### Q2 — MCP server declaration inside plugin
Can plugin's manifest declare `mcpServers: {local-mcp-toolbelt: {command, args}}`
that auto-registers on install? Or must plugin run a post-install
script that calls `claude mcp add -s user`?

### Q3 — Hook bundling
Can plugin bundle `.claude/hooks/enforce-bridge.sh` and have it auto-
installed to user/project scope? At what scope?

### Q4 — Marketplace channels — which to target?
`claude-code-marketplace` (community) vs `claude-plugins-official`
(Anthropic-curated): which is right for an Apache-2.0 third-party
plugin like ours? Submission process? Approval timeline if known?

### Q5 — npm coordination
Bridge is also npm package `local-mcp-toolbelt`. Plugin packaging
needs the same code. Should:
- (a) Plugin BUNDLE the node binary + dist code (heavy)
- (b) Plugin only manifest; install triggers `npm i -g local-mcp-toolbelt`
- (c) Plugin manifest references `npx local-mcp-toolbelt serve`
- (d) Some other arrangement

### Q6 — Plugin development / testing workflow
How does developer iterate on a plugin during dev? Local install
from path? Sideloading? Hot reload?

### Q7 — Migration path from current setup
Current users (just me) have bridge via Claude Desktop IPC + project
.claude/hooks/. Migration to plugin: do they need to uninstall the
old hookup? Coexistence?

### Q8 — Risks / blockers
What can go wrong? Approval gating, sandboxing, MCP registration
conflicts, version sync, hook path resolution differences across
plugin scope...

## Output shape (≤900 words)

For each Q (1-8):
- **Finding** (with EMPIRICAL/CITED-UNVERIFIED label)
- **Source** (real URL you visited OR "NOT FOUND")
- **Recommendation** (1-2 sentences)
- **Confidence** (solid/weak/NOT FOUND)

End with:
- **Concrete 4-phase delivery sequence** (e.g. phase 1: research,
  phase 2: skeleton plugin, phase 3: marketplace submission, phase
  4: deprecate old hookup) — each phase with 1-3 specific actions
- **Top 3 unknowns** (questions a follow-up research step must answer)
- **Self-bias note**

## Anti-woozle reminder

Today's session 2026-05-22 saw 5 voices converge on wrong answer
because brief framing baked in unverified citation. This brief
explicitly separates EMPIRICAL from ASSUMED. If you find an ASSUMED
fact is actually true via official docs, mark it EMPIRICAL with
URL. If you find it's WRONG, that's the most valuable finding.
Don't just rephrase ASSUMED into your output — verify or label.
