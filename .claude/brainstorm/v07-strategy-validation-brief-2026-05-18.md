# Brief: v0.7+ improvement-direction strategy — adversarial validation

Synthesizer (Claude) just listed v0.7 improvement themes after the
12→8 scope reduction. **Voices: challenge this strategy.** 200-400
words. Risk presentation matched.

## Project context (today's state)

`local-mcp-toolbelt` Apache-2.0 MCP server. v0.6.0 shipped. v0.7+ scope
reduced today via 4-voice fan-out: **6 P0 + 2 P1 = 8 axes** (was 12).
Synthesizer's 8 axes:
- P0: omcp install, hook artefact ship, config merge, cross-platform
  fail-fast, **uninstall** (NEW — caught unanimously by today's voices)
- P1: --verify, model download consent UX

User constraint: no paid LLM API. Has free GitHub Models PAT, free
GCP $265 credit (90-day expiry; deferred), Google AI Pro OAuth (dies
2026-06-18). 16 GB Apple Silicon Mac dev box.

## Synthesizer's "improvement directions" answer (CHALLENGE THIS)

### v0.7 delivery themes (what v0.7 sells)
1. **Zero-friction install**: README 10 steps → `omcp install` one-liner
2. **Lifecycle完整**: install + uninstall + verify; no cruft
3. **Platform clarity**: Linux/Windows fail-fast (was: silent 10-min
   download then opaque error)
4. **Single-MCP-client first**: Claude Desktop config; multi-client
   v0.8+

### v0.8+ deferred (6 axes + new ideas)
- Multi-client native (Cursor/Cline/Zed)
- Sentinel + custom-hook upgrade path
- npx vs npm-g unification + POSIX-vs-Node hook
- SEP-2663 server-side capability negotiation
- New tools: embedding tier (`bge-m3-mlx`) for `diff-semantic-index`
- Observability: `omcp doctor` / `--debug` flag

### Synthesizer's claim
> "v0.7 真正交付 = 4 句话: 一行装、完整卸、平台清、单客户端先打通."
>
> "v0.7 → v0.8 之间最高 leverage 单项 = 多 MCP 客户端原生支持
> (直接扩用户基数 N×)."

## Your task

1. **Rank the 4 v0.7 themes** by actual delivered user value
   (1=biggest impact, 4=smallest). Justify each.
2. **Attack the "highest-leverage v0.8 = multi-client" claim**:
   concrete failure mode OR better alternative. (Hint: maybe
   embedding tier > multi-client? observability > multi-client?
   marketing > all of them? — find something stronger.)
3. **Identify a MISSING strategic direction** beyond the 8 axes
   AND the v0.8 list. Be specific. Examples to seed thinking:
   - Performance/latency (current Tier B ~600 ms+ for short)
   - Eval / benchmarks (publishable evidence of token savings)
   - Documentation / examples (README quality, screencast)
   - npm marketing (changelog narrative, social posts)
   - Community ecosystem (PR templates, contribution guide,
     issue auto-triage)
4. **Self-bias note**: if your model family has skin in any
   direction, disclose.

Be concrete. Voices today have fabricated specifics — name
features only if you can vouch for them, flag "uncertain"
otherwise.
