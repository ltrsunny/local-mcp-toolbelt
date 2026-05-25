# Brief: round 2 on copilot-free picker — resolve 3-voice divergence

> **🚫 DISPROVED 2026-05-22 (post-fan-out empirical retest)**:
> Round 2 inherited Round 1's "avoid Gemini 3.x" framing from
> LiteLLM #21041 citation, which was later empirically disproved
> (`gemini-3.5-flash` works for tool_calls via OAI-compat shim;
> Google's docs use it as the canonical example). 5 voices across
> rounds 1+2 converged on "switch to 2.5-flash" — wrong answer
> propagated by shared brief framing. KEPT in repo as empirical
> evidence of woozle effect across multi-round fan-outs. See
> auditor-protocol.md anti-patterns #21+#22.

Round 1 (3 voices) produced sharp divergence on the design. You are
a round 2 voice. **Pick a side OR propose new synthesis**.

## Round 1 baseline facts (all 3 voices agreed)

- helpers.sh `copilot-free` currently hardcoded `gemini-3.5-flash`
- Gemini API `/v1beta/models` returns model list but NO tool-calling
  flag — must use family allowlist
- OAI-compat shim cap ~17.2K tokens (Copilot's sysprompt ~17K leaves
  ~200 chars user budget)
- AI Studio free quota 150/day low-tier (per model)
- Copilot CLI takes ONE model per invocation; can't pass fallback list

## Round 1 KEY EMPIRICAL FINDING (Claude voice, verified)

Gemini **3.x** family has known ReAct breakage on OAI-compat shim:
- LiteLLM issue #21041: Gemini 3 Flash returns `finish_reason: "stop"`
  instead of `"tool_calls"` (kills Copilot ReAct loops silently)
- openai/codex #7519: Gemini 3 Pro drops `thought_signature`
- google-api-python-client #2701: 400 Invalid Argument on Gemini 3
  Flash Preview function calling

**Implication**: today's hardcoded default `gemini-3.5-flash` may be
silently broken for ReAct-required tasks. We haven't observed it
because all today's invocations hit shim-cap 400 BEFORE the ReAct
phase. Switching default to `gemini-2.5-flash` family is recommended
regardless of dynamic-picker decision.

## The 3 divergence points

### D1 — Ping strategy
- **Claude**: smoke-test ReAct shape (mini tool-call probe). Picker's
  VALUE is the probe, not the shuffle.
- **agy_pro**: **SKIP ping entirely**. 150/day per-model quota — a
  5-tok ping per invocation burns 1/150 of usable calls for ZERO
  product output. Catalog drifts slow on Google side, so liveness-
  probe value is low.
- **nv_pro**: minimal ping (no sysprompt) — 5-tok request, 200=healthy.
  Sufficient because Copilot's 17K sysprompt is added at invoke time,
  not ping time.

### D2 — Selection policy
- **Claude**: prefer fastest deterministic (e.g., 3.5-flash). Google
  deprecates loudly so catalog-drift hallucination risk is near-zero.
  Shuffle adds no value here.
- **agy_pro**: prefer fastest (3.5-flash). Copilot UI blocks during
  generation; latency is the felt cost.
- **nv_pro**: random shuffle. Spreads quota across pool, prevents
  per-model hammering, matches NIM/GHM picker pattern.

### D3 — Whether to extend iron rule at all
- **Claude**: ambiguous — probe value is real, shuffle value is null
- **agy_pro**: **DO NOT EXTEND**. Pool too small (3-5), quota too
  constrained, dynamic adds cost without benefit. Hardcoded with
  COPILOT_FREE_MODEL env override IS the optimal design.
- **nv_pro**: **DO EXTEND**. Resilience + quota distribution + iron
  rule consistency.

## Your task

For each of D1, D2, D3:
- **Pick a side** (Claude / agy_pro / nv_pro), with specific rationale
- OR **propose a synthesis** that combines / supersedes them

Also answer:
- **Does the 3.x ReAct bug evidence change the "skip vs ping" calculus?**
  Specifically: if 3.x silently breaks ReAct, does a "ping that
  validates tool_calls response" become essential (matching Claude's
  position) OR is the bug evidence enough to drive family-allowlist
  filter without per-call ping (matching agy_pro)?

- **Tie-breaker question**: design must minimize regret-risk. If we
  hardcode `gemini-2.5-flash` today and Google deprecates it 6 months
  later, what's the silent-failure recovery time? Compare to: dynamic
  picker burns 1/150 quota per call but auto-recovers from deprecation.

## Output shape (≤500 words)

```
D1: <Claude|agy|nv|synthesis>  — <one sentence rationale>
D2: <Claude|agy|nv|synthesis>  — <one sentence rationale>
D3: <Claude|agy|nv|synthesis>  — <one sentence rationale>
3.x bug → ping calculus: <change|no-change>
Tie-breaker: <quota cost worth it / not worth it>

Final patch design (helpers.sh diff sketch):
<5-15 line sketch>

Top risk:
<one>

Self-bias note:
<one line>
```

Hard constraint: real evidence preferred. Cite if you have new sources.
