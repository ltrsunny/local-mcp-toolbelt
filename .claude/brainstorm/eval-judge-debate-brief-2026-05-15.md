# Brief: judge step for v0.6.0 Phase 1 eval

You are a senior architect reviewing a small but consequential choice
in `local-mcp-toolbelt` v0.6.0 release prep. Output a Markdown
response, 200-400 words, ending with one explicit option recommendation.
No preamble. Be ready to push back if the trade-off table is misframed.

## Context

- `local-mcp-toolbelt` is an Apache-2.0 MCP server that delegates
  summarize / classify / extract / transform to a local Qwen3 on oMLX.
  v0.5.0 stabilised the backend; v0.6.0 adds per-tool thinking-mode
  defaults (`summarize*` default OFF, `classify`/`extract`/`transform`
  default ON), an async-job triad portable across MCP clients,
  and CHANGELOG/deprecation flags landed today (`b3542a3`).
- Day 4-5 release prep includes "rerun Phase 1 eval with new defaults,
  target mean judge score ≥ 4.0/5".
- Phase 1 design: 5 fixtures × 5 trials × per-fixture tier (01/02
  Tier C, 03/05 Tier D, 04 Tier B). The runner is executing in the
  background right now and producing raw JSONL outputs regardless of
  judge choice.

## Baseline state

- **v0.5.1 baseline used Anthropic API (Sonnet-class) as judge.**
- v0.5.1 result: **3/3 tiers FAILED the ≥ 4.0/5 bar.**
- v0.6.0 hypothesises improvement via thinking-mode defaults:
  summarize gets faster + tighter (no reasoning trace bloating output),
  classify/extract get more accurate (model thinks first).

## The open question

How should we score v0.6.0 outputs?

| Option | Judge | Comparable to v0.5.1? | Cost | Effort |
|---|---|---|---|---|
| A | Anthropic API (`judge.mjs` as-is) | **✓ Yes** | ~$1-3 user's Anthropic credit | 0 (script ready) |
| B | `nv_pro` (Qwen3.5-397b on NIM) | ✗ New baseline | 0 (free NIM quota) | ~30 min to swap backend in `judge.mjs` |
| C | `gem` (Gemini-3.1-pro) | ✗ New baseline | 0 (user's Pro subscription) | ~30 min code change |
| D | Frontier Claude session reads samples manually | Partial | frontier tokens | 0 code, ~30 min manual reading |
| E | Skip judge; runner-only | n/a | 0 | 0 |

## Specific tensions to weigh

1. **Baseline comparability**. v0.5.1's 3/3 tier failure is the
   reference point we're claiming to improve on. Switching judge means
   v0.6.0 numbers float on a new scale and you can't say "improved
   from 3/3 fail to N/3 pass" without re-running v0.5.1 under the
   same new judge — which doubles the work.
2. **Cost vs discipline**. $1-3 is trivial in dollars but the user
   has repeatedly pushed back on "skip the cost, do it lazy" in this
   project's history.
3. **Self-family bias risk**. Bridge subjects are Qwen3 (4B/8B/14B);
   `nv_pro` is Qwen3.5-397b — same model family, much larger. Does
   the family similarity bias the scoring (over-credit on style/
   tokeniser-similar outputs)? Anthropic Sonnet and Gemini-3.1-pro
   are out-of-family and avoid this systematically.
4. **Forward direction for v0.7+**. If we're moving away from
   Anthropic-judge for some principled reason (free / repro / etc),
   now's the moment to switch. If not, switching is gratuitous churn.

## Your task

Pick ONE option (or propose F). Be concrete:

1. Which option fits a project whose PM has *repeatedly* pushed back
   on lazy shortcuts but also values forward-portable infrastructure?
2. Is the family-similarity bias of `nv_pro` real and material, or
   over-cautious?
3. Is there a reason to switch judges in v0.6.0 specifically, vs
   defer to v0.7+ when a principled motivation emerges?

Write to your path:
- copilot → `/Users/rd/ollama-claude/.claude/brainstorm/eval-judge-debate-copilot.md`
- gem     → `/Users/rd/ollama-claude/.claude/brainstorm/eval-judge-debate-gem.md`
- nv_pro  → stdout (will be captured)

Output: comment body only — no preamble, no meta-discussion.
