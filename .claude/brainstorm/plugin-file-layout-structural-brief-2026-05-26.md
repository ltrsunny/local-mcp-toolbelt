# Brief: structural file-layout blocker for plugin + npm dual distribution

You are 1 of N voices solving a layout conflict: `local-mcp-toolbelt`
needs to ship as BOTH (a) an npm package and (b) a Claude Code plugin
installable via marketplace. The two distribution channels expect
files in different places. Synthesizer reached 3 candidate fixes
(F1/F2/F3) but didn't vet them.

Per #21 (Citation ≠ Evidence): mark EMPIRICAL or CITED-UNVERIFIED.
Per #22 (Brief framing seeds woozle): challenge F1/F2/F3 framing if
you can propose F4+. Don't be locked in.

## EMPIRICAL facts this session 2026-05-26

- Monorepo layout: repo root `/Users/rd/ollama-claude/`. npm package
  config at `packages/core/package.json` (name: `local-mcp-toolbelt`,
  v0.6.0, bin: `local-mcp` → `./dist/bin/cli.js`).
- `packages/core/package.json files[]` = `["dist", "README.md",
  "LICENSE", "NOTICE"]` — npm tarball ONLY ships these.
- `.gitignore` line 2: `dist/` — gitignored at repo root and per-package.
- Plugin PoC files (committed today) at REPO ROOT:
  - `.claude-plugin/plugin.json`
  - `.claude-plugin/marketplace.json`
  - `.mcp.json` (current: absolute path `/Users/rd/ollama-claude/...`)
  - `hooks/hooks.json` (references `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/enforce-bridge.sh`)
- enforce-bridge.sh hook script at `.claude/hooks/enforce-bridge.sh`
  (repo-internal, git-tracked).
- Claude Code plugin sources supported (per docs verified earlier):
  `github`, `url`, `git-subdir`, `npm`, relative-path.
- npm tarball: built from `packages/core/`, **does NOT include**
  repo-root `.claude-plugin/`, `.mcp.json`, `hooks/`, or
  `.claude/hooks/enforce-bridge.sh`.

## The conflict (EMPIRICAL)

Plugin marketplace install pulls files via the plugin's `source` field:

| Source type | Pulls from | Has plugin meta (`.claude-plugin/`, `.mcp.json`, `hooks/`)? | Has compiled cli.js (`dist/`)? |
|---|---|---|---|
| `github` (whole repo) | git clone | ✓ (root) | ✗ (gitignored) |
| `npm` (tarball) | npm registry | ✗ (not in `files[]`) | ✓ |
| `git-subdir` packages/core | sparse clone | ✗ | ✗ (same gitignore) |
| `git-subdir` repo-root | sparse clone | ✓ | ✗ |
| local `./` (dev only) | local fs | ✓ (you built it) | ✓ if locally built |

**No single source type has BOTH plugin meta + cli.js**.

## 3 candidate fixes (synthesizer-drafted, NOT VETTED)

### F1: commit `dist/` to git (bad practice, simple)
- Remove `dist/` from `.gitignore` for `packages/core/dist/`
- Build → commit dist/ → push
- github source then works (clone has dist/)
- Costs: repo bloat, build artifacts in git history, merge conflicts on dist/ if multiple devs

### F2: move plugin meta into `packages/core/` + update `files[]`
- Move `.claude-plugin/*`, `.mcp.json`, `hooks/` from REPO root to `packages/core/`
- Update `packages/core/package.json` `files[]` to include them
- npm tarball now has plugin meta + dist/
- Plugin source `{"source": "npm", "package": "local-mcp-toolbelt"}` works
- Costs: refactor repo layout; settles plugin AT npm package root (monorepo-friendly)
- Need to verify: does Claude Code plugin work when installed via npm source?

### F3: GitHub Actions auto-build, commit dist/ to dedicated `release` branch
- CI builds + force-pushes dist/ to `release` branch
- Marketplace.json plugin source `{"source": "github", "repo": "ltrsunny/local-mcp-toolbelt", "ref": "release"}`
- main branch stays clean (no dist/), release branch has everything
- Costs: branch-switching mental model; CI maintenance; double-state

### F4+ (propose new option if you see one)

## Decision criteria

1. Idiomatic-ness: how standard / well-trodden is this approach?
2. Dev maintenance cost: ongoing effort per release
3. Reversibility: how hard to undo if it doesn't work?
4. User-side complexity: any friction added to install/use?
5. Compatibility: works across both Claude Code plugin marketplace + standalone npm consumer?
6. Build authenticity: does dist/ match source state at release?

## Output shape (≤600 words)

For each F1/F2/F3 (and any F4+):
- **Score 1-5 per criterion 1-6** (or N/A)
- **One-sentence rationale per criterion**

End with:
- **Your verdict**: F1 / F2 / F3 / F4+ (pick one)
- **Why** (1-2 sentences)
- **Top risk** of your chosen direction
- **Empirical check needed**: what to verify before committing to this direction
- **Self-bias note**

## Anti-woozle reminders

- All 3 fixes are synthesizer-drafted under a possibly limited frame.
  If F4+ exists (e.g. hybrid, or completely different distribution
  model), say so.
- If you assert "X works/doesn't work", mark EMPIRICAL only if you
  actually have evidence. The Claude Code plugin `npm` source behavior
  hasn't been empirically tested this session — claims about it
  should be CITED-UNVERIFIED.
