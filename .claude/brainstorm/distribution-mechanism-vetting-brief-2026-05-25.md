# Brief: distribution mechanism for `local-mcp-toolbelt` — vet plugin path

You are 1 of N voices doing adversarial review on the DISTRIBUTION
MECHANISM choice. Synthesizer (current Claude orchestrator) earlier
today pre-framed "Claude Code plugin" as the answer to "即装即用"
without challenge, ran a fan-out under THAT framing, built PoC,
committed 2 commits. User just asked: was plugin actually best?
Synthesizer admitted no adversarial vet happened — this brief fixes
that omission. **Equal weight A/B/C/D**, no pre-framed answer.

Per anti-pattern #21 (Citation ≠ Evidence, auditor-protocol added
2026-05-22): if you claim X is true, label EMPIRICAL (you verified
via real URL/test) or ASSUMED (carrying prior trust) or
CITED-UNVERIFIED (cite but didn't verify). Fabricated EMPIRICAL
labels are recognized as #21 violations.

Per #22 (Brief framing seeds woozle): facts below are SPLIT into
EMPIRICAL (verified in today's session) and ASSUMED. Push back on
the ASSUMED ones if you can verify otherwise.

## Goal (the actual question)

`local-mcp-toolbelt` (Apache-2.0 npm MCP server, v0.6.0) needs to
ship so that arbitrary Claude Code users get bridge tools available
in their sessions. **What's the right distribution mechanism**:

- **A. Claude Code Plugin via marketplace** (current PoC path)
- **B. npm publish + manual `claude mcp add -s user` per-user**
- **C. npm publish + bundled `omcp install` subcommand that runs
  `claude mcp add` automatically**
- **D. Status quo + documentation** (manual setup, no automation)

Or propose **E. something else**.

## Known facts EMPIRICAL (verified today 2026-05-25)

- `claude mcp add -s user <name> <command> -- <args>` works to
  register MCP servers at user scope. User scope = available in
  every Claude Code session on this machine.
- Plugin install via `claude plugin install <name>@<marketplace>`
  works for local-directory marketplace. Verified
  end-to-end at user scope (auto-writes to ~/.claude/settings.json
  `enabledPlugins` + `extraKnownMarketplaces`).
- `.mcp.json` args do NOT expand `${CLAUDE_PROJECT_DIR}` or
  `${CLAUDE_PLUGIN_ROOT}` when loaded as project config — display
  shows literal `${...}`. Whether they expand when loaded via
  plugin install context is untested.
- Plugin marketplace.json `"source": "./"` accepted; `"source": "."`
  rejected with "source type not supported".
- Claude Desktop has its own MCP config at
  `~/Library/Application Support/Claude/claude_desktop_config.json`.
  Claude Desktop-launched Claude Code sessions inherit Desktop's
  MCP via IPC.
- `claude mcp add-from-claude-desktop` exists (subcommand).

## Known facts ASSUMED (NOT verified today)

- `local-mcp-toolbelt` has NEVER been `npm publish`'d. Need to
  verify by checking `https://www.npmjs.com/package/local-mcp-toolbelt`.
- Plugin marketplace submission process documented at
  `claude.ai/settings/plugins/submit` (per docs we WebFetched).
  Review timeline / acceptance rate not measured.
- Once a plugin is in `claude-community` marketplace, ANY Claude
  Code user can install via `/plugin install <name>@claude-community`.
- `claude mcp add` from npm-published bin would look like:
  `claude mcp add -s user local-mcp-toolbelt -- npx local-mcp-toolbelt serve`
  — assumes `local-mcp-toolbelt` package provides a CLI entry
  with `serve` subcommand. Verify against package.json.

## Decision criteria (score each option 1-5)

1. **User install friction** — clicks/commands required by a NEW
   user to get bridge tools working in their Claude Code
2. **Dev shipping cost** — work needed to make this mechanism
   actually distribute (npm publish, GitHub push, marketplace
   submission, etc.)
3. **Portability** — does it work on Linux/Windows/macOS without
   bespoke per-machine setup?
4. **Discoverability** — how does a user FIND `local-mcp-toolbelt`
   exists?
5. **Maintenance over time** — what happens when bridge gets
   updated? Auto-update? Manual?
6. **Lock-in to Anthropic mechanisms** — if Anthropic changes
   plugin spec, how brittle?
7. **Hooks bundling** — current setup ships `enforce-bridge.sh`
   hook. Which mechanisms can also ship hooks?

## Output shape (≤700 words)

For each of A/B/C/D (and optional E):
- **Score 1-5 per criterion 1-7** (or "N/A" if doesn't apply)
- **One-sentence rationale per criterion**

End with:
- **Your verdict** — A / B / C / D / E (PICK ONE; ranked
  preference if hung)
- **Top 2 risks** of your chosen direction
- **What would change your mind** — what evidence flips this
- **EMPIRICAL/ASSUMED/CITED labels** on your load-bearing claims
- **Self-bias note** — family overlap with question subject

## Anti-woozle reminder

Synthesizer is **suspicious of voices labeling EMPIRICAL when they
can't actually run a test or fetch a URL**. Today (2026-05-22)
multiple voices self-labeled EMPIRICAL on fabricated content. If
you don't have web access or can't run commands, ALL your claims
are CITED-UNVERIFIED at best. Be honest.
