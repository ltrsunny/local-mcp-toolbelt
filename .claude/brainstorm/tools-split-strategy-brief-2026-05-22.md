# Brief: tools architecture — split into 2 projects or keep current?

You are 1 of N voices doing a STRATEGY review. PM wants a decision on
how to organize 2 tool ecosystems that have been co-evolving in one
workflow. Real prior-art research preferred where available; for
strategy/process questions, your reasoned analysis is the deliverable.

## The 2 ecosystems

### Ecosystem 1: `local-mcp-toolbelt` (the bridge)
- Apache-2.0 npm package + MCP server
- Node 22+, TypeScript strict, vitest (147 unit tests)
- v0.5.0, follows SemVer
- Commits: `feat/fix/release/chore` (product) + `meta(*)` (dev meta)
- Exposed tools: summarize / summarize-long / summarize-long-chunked /
  classify / extract / transform / diff-semantic-index
- Backend: MlxHttpBackend → oMLX (Qwen3-4B / Qwen3-8B tiers)
- Audience: anyone running Claude Desktop / Cursor / Cline / etc
  as an MCP client; saves frontier tokens via local inference
- Repo: https://github.com/<owner>/local-mcp-toolbelt (in `~/ollama-claude/`)
- Auditor protocol: mandatory Prior Art Review + scope memo before
  any feature lands

### Ecosystem 2: helpers.sh (the orchestration layer)
- Bash file in `~/.config/claude-dev/helpers.sh` (not in any git repo today)
- 8 functions today: gem / gem-pro / ghm / ghm_pro / nv_sum / nv_pro /
  agy_pro / copilot-free, plus 2 picker functions (`_nim_pick_model`,
  `_ghm_pick_model`) and 1 caller (`_ghm_call`)
- Connects to: Gemini family (3.5-flash REST, 2.5-pro OAuth), GitHub
  Models, NVIDIA NIM, Anthropic via tools, Antigravity CLI, Copilot CLI
- Commits: would be `meta(*)` only (no product surface)
- Audience: ME, the human running this terminal
- Today's iron rules established: dynamic NIM picker, dynamic GHM
  picker (both fresh-smoke catalog + ping per call, no env override)
- Today's bugs caught in real-time: A (gem thinkingConfig empirically
  not root cause), B (bridge-edit marker too narrow), C (ghm dynamic
  picker), D (max_tokens 600 cap)

## Today's coupling observations

Real evidence from 2026-05-22 session:
- The "iron rule" pattern (fresh-smoke catalog + ping, no env override)
  emerged by iterating NIM picker first, then mechanically extending
  to GHM. Cross-pollination was real.
- helpers.sh changes touch only ONE file but cause 4-5 commits worth
  of CLAUDE.md (in bridge repo) updates as the "outside-help cheat
  sheet" stays in sync.
- Bridge enforcement hook (`.claude/hooks/enforce-bridge.sh`) is in
  the bridge repo but its design future-rolls into a bridge feature
  (`omcp install-hooks`). So helpers.sh, hook design, and bridge
  product all influence each other.
- "Out of tree" friction: today multiple times we wanted to commit
  helpers.sh changes alongside CLAUDE.md changes, but couldn't
  because helpers.sh isn't tracked.

## The 3 candidate models

### A. Status quo
helpers.sh stays in `~/.config/claude-dev/`, not tracked in any git
repo. CLAUDE.md in bridge repo documents the contract.
- **Pro**: zero migration cost; tight iteration loop
- **Con**: no version history for helpers.sh; reproducibility is
  fragile; if helpers.sh breaks, no `git bisect`
- **Pro**: separation is conceptually clean (bridge=shippable, helpers=personal)

### B. Single-repo absorption
helpers.sh moves to `bridge-repo/dev-shell/helpers.sh`, tracked in
bridge git. Excluded from npm publish (`files` array in package.json).
- **Pro**: single commit can update bridge contract + helpers.sh
  client + docs together
- **Pro**: bridge repo gets `dev-shell/` as installable tooling for
  bridge developers (could become `omcp install-helpers`)
- **Con**: pollutes product repo with personal dotfiles
- **Con**: bridge's `feat/fix/release/chore` discipline clashes with
  helpers's `meta(*)`-only nature
- **Con**: bridge auditor protocol (Prior Art + scope memo) doesn't
  fit helpers (which is meant to iterate fast)

### C. Two-repo split
helpers.sh becomes its own git repo at `~/.config/claude-dev/`
(or moved to `~/orchestration-helpers/`). Two repos cross-reference
each other in their respective CLAUDE.md files.
- **Pro**: clean separation of concerns
- **Pro**: helpers.sh gets version history without polluting bridge
- **Con**: context-switching cost — 2 repos to keep in sync
- **Con**: today's cross-pollination iteration may slow down
- **Con**: 2 CLAUDE.md files to maintain

## Decision criteria (weight each)

1. **Real-time bug discovery**: today caught 4 bugs via tight loop.
   Which model preserves this best?
2. **Hygiene boundaries**: bridge is publishable; helpers is personal.
   Which model respects this best?
3. **Cross-pollination capture**: iron rule emerged from iterating
   both. Which model keeps this alive?
4. **Reproducibility / git history**: which gives helpers.sh proper
   versioning?
5. **Future-proofing**: bridge v0.7+ scope memos already imagine
   shipping hooks + helpers as bridge features. Which model
   gracefully evolves to that?
6. **Cognitive load**: solo developer, no team. Multi-repo overhead?

## Your task

For each option (A/B/C):
- **Score 1-5 per criterion** (1=weak, 5=strong)
- **One-sentence rationale per criterion**

End with:
- **Your verdict**: A / B / C (pick one)
- **Top 2 risks** of your chosen option
- **What would change your mind**: 1 sentence on what evidence would
  flip your verdict
- **Self-bias note**: family overlap or framing bias

Hard constraint: real evidence / reasoning only. If you cite prior
art (e.g. monorepo discussions), use real URLs. NOT FOUND if you
can't verify.

≤800 words. Be specific.
