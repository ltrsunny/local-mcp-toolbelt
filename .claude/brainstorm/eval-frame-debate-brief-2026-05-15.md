# Brief: is "rerun Phase 1 LLM-judge eval" the right v0.6.0 release gate?

You are a senior architect doing **adversarial review of the FRAMING**,
not picking inside it. The previous round in this session
(eval-judge-debate) chose between A-E judge backends. The PM caught
that the upstream framing — "v0.6.0 release requires Phase 1 eval
rerun with LLM-as-judge, scored against a ≥ 4.0/5 bar" — was assumed,
not audited.

Your job: challenge the framing. Recommend whether v0.6.0 should
ship with a different validation mechanism. Output 300-500 words.
End with one explicit recommendation. No preamble.

## What the prior framing assumed

1. **v0.6.0 must rerun Phase 1 eval** before release. (Carried over
   from v0.5.0's scope memo. Not re-audited for v0.6.0's specific
   changes.)
2. **Phase 1 design** = 5 fixtures × 5 trials × LLM-as-judge × ≥ 4.0/5
   mean score. (Designed pre-thinking-mode, pre-async-triad.)
3. **Comparability to v0.5.1 baseline** is the success anchor.
   (v0.5.1 baseline reported 3/3 tiers FAIL — itself evidence that
   the design / bar may be miscalibrated, not that the underlying
   models are bad.)
4. **LLM-as-judge is required**. (Even though 2 of the 5 fixtures —
   03-classify and 04-extract — produce JSON that can be matched
   against gold programmatically. Only 01-summarize-long and
   05-transform produce prose that genuinely needs a semantic judge.)
5. **The option space is "which judge backend"** (Anthropic / nv_pro
   / gem / manual / skip). The PM correctly pointed out this option
   set itself wasn't audited.

## What v0.6.0 actually changes vs v0.5.x

- Per-tool thinking-mode defaults — *behavioural* change. summarize
  tools get `/no_think`; classify/extract/transform don't.
- Async-job triad — *protocol* change (new tools, new dedup hash,
  new wait_command escaping). Already covered by ~25 new unit tests
  added during Day 1-3.
- 6 sync tools gain `thinking` parameter — schema addition.
- Deprecation flags on legacy v0.3.0 names — pure copy edit.

The async triad and deprecation flags are not eval-shaped questions;
they're invariant-style verifications already done at the unit-test
layer (170 unit tests pass).

The thinking-mode defaults ARE behaviourally observable. Specifically:
- summarize-long output size + speed (no reasoning trace bloat)
- classify accuracy (model thinks first → better label choices)

## Alternative validation mechanisms

- **F. Programmatic gold-match on structured tasks** + spot-check on
  prose tasks. classify/extract have JSON gold files; structurally
  comparing labels and fields can be 100% automated. Only
  summarize-long and transform need *any* judge, and even there a
  small manual spot-check (5-10 samples by a frontier model in the
  PM's session) is more probative than 25 LLM-judged samples scored
  against an unstable baseline.
- **G. Dogfood-based release gate.** v0.6.0 has been getting
  dogfooded *this session* (the bridge `extract` calls, the
  fan-outs, the synthesis retrospective). Continued real-use across
  the next N days, with a release-blocker for any production-quality
  regression, is more relevant than synthetic fixtures.
- **H. Ship on unit tests + behavioural assertions.** 170 unit tests
  pass. Add a couple of new tests that assert "summarize with
  thinking=off does not contain `<think>` tags in output" and
  "classify with thinking=on includes reasoning before final label".
  Then ship; observe real-use; cut a v0.6.1 if anything surfaces.
- **I. Defer eval rerun to v0.7+** when scope changes (e.g., real
  introduction of MCP Tasks SEP-2663) warrant a clean validation
  pass under a designed-for-purpose harness, not a v0.5.0 carryover.

## The constraint the PM raised

- **No budget outside existing subscriptions.** Rules out Anthropic
  API. Rules in: free NIM (`nv_pro`), Pro-subscription Gemini
  (`gem`), or no-LLM-judge entirely.
- Prior audit (this session) showed `nv_pro` introduces self-family
  bias (Qwen3.5 judging Qwen3 outputs). `gem` is out-of-family but
  introduces new baseline.

## Your task

1. Should v0.6.0 ship without a Phase 1 rerun at all? On what basis?
2. If yes, what's the alternative release gate? (F/G/H/I or other)
3. If no, what's the minimum validation that's both within budget
   AND not a methodological downgrade from v0.5.1?
4. **Push back on assumptions you spot** — including the four I
   listed above, or any I missed.

Write to your path:
- copilot → `/Users/rd/ollama-claude/.claude/brainstorm/eval-frame-debate-copilot.md`
- gem     → `/Users/rd/ollama-claude/.claude/brainstorm/eval-frame-debate-gem.md`
- nv_pro  → stdout (will be captured)
