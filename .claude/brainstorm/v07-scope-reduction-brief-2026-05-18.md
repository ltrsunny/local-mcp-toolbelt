# Brief: v0.7+ scope reduction — 12 axes to 3-5 v0.7-gating

Synthesizer (Claude) has a tentative cut. **Challenge it.** Risk
presentation matched. Adversarial fan-out.

## Project context

`local-mcp-toolbelt` is Apache-2.0 MCP server delegating
summarize/extract/classify/transform to oMLX (Qwen3 on Apple
Silicon). Shipped at v0.6.0. v0.7+ planned: **`omcp install` as
shipped product feature** (currently in-repo `enforce-bridge.sh`
hook + manual README setup is the prototype).

Scope memo at `docs/scope-memos/v0.7.0-install-2026-05-15.md`
is at Draft 0 (outline only) with **12 implementation axes + 10
open questions**. PA review (next step per memo) on all 12 = days
of work. **v0.7 is a minor version, not v1.0** — over-scoping is
the failure mode here.

## The 12 axes

1. `omcp install` — main entrypoint
2. Hook script as shipped artefact (productized
   `enforce-bridge.sh`)
3. Verification via `omcp install --verify`
4. Model download consent UX (7.5 GB tier B+C weights — prompt?
   `--yes`? skip-by-default?)
5. Config merge strategy when MCP entry exists
6. Hook sentinel format (how to mark "this hook is ours" for
   later uninstall)
7. Multi-client config handling (Claude Desktop + Cursor +
   Cline + Zed — write to all? primary?)
8. Cross-platform fail-fast (Linux / Windows — oMLX is
   Apple-Silicon only; clean error)
9. `npx` vs `npm install -g` (which install path)
10. POSIX-sh-only vs Node-based hook implementation
11. Upgrade path if user has customized their hook
12. SEP-2663 server-side capability negotiation (future MCP
    feature that may obsolete client-side enforcement)

## Synthesizer's tentative cut (CHALLENGE)

| Tier | Axes | Why |
|---|---|---|
| **P0 — v0.7 must** | 1, 2, 5 | install command + hook artefact + config merge are the irreducible product |
| **P1 — v0.7 should** | 3, 4 | verification + model download consent — make it actually usable |
| **defer to v0.8+** | 6-12 (sentinel, multi-client, cross-platform, npx-vs-npm, POSIX-vs-Node, upgrade-path, SEP-2663) | edge cases or future-tech overlaps |

## Today's evidence informing this

- Bridge enforcement hook proven valuable today (`~/.config/claude-
  dev` allowlist added in 2026-05-18 commit; hook fires correctly
  on analysis-path / external-file violations)
- GitHub Models / Vertex Anthropic / Vertex Llama added to
  voice portfolio today — but project's main user value is
  still **local oMLX delegation**, not the voice ecosystem
- 90-day GCP credit deferred per user constraint; can't bank on
  cloud-side install demo for v0.7

## Your task

1. **Rank the 12 axes by v0.7-gating necessity** (1=must, 5=can
   defer to v0.8+, with intermediate values OK).
2. **Attack the synthesizer's cut**: pick ONE axis the cut got
   wrong (either an in-P0 that should defer, OR a deferred one
   that's actually P0). Concrete failure mode.
3. **Spot what's MISSING** — name 1-2 axes not in the 12 that
   v0.7 needs but the memo author missed (e.g. uninstall path?
   doctor/diagnose command? observability/logging?).
4. **MVP test**: define the THINNEST possible v0.7 that's
   shippable + valuable. Could be 2 axes. Could be 5. Justify.
5. **Self-bias note**: if your model family is associated with
   any axis (e.g. you're an OpenAI model and #5 involves OpenAI
   MCP config), flag it.

200-400 words. Comment body only. Be concrete — voices today
fabricated specific API names; v0.7 is implementation-near so
specificity needs to be honest.
