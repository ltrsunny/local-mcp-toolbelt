# Brief: deep web research on LLM-orchestration anti-hallucination

You are one of 3 agentic voices tasked with **REAL web research**
(NOT training-data recall). Multiple web searches required; cite
every claim with a working URL.

## Context

Recent session caught voices fabricating specific citations and
historical incidents (real examples from this project's logs):
- A voice cited `antigravity.ai/docs/v1/conversations#model-inheritance`
  — real domain is `antigravity.google`, no such page exists.
- A voice referenced "2025-Q3 auto-tagging incident" as background —
  no such incident occurred in this project.
- Voices invented specific API endpoint names like "Vertex AI
  Notebooks generative-cloud private preview" that don't exist.

The pattern: voice confabulates a plausible-sounding citation to
make conclusions appear authoritative. **The conclusion sometimes
happens to be correct, but the supporting evidence is invented.**

This is the **#1 risk** for multi-source brainstorm portfolios.
We need ACTIONABLE rules, not philosophy.

## Your task

Do real web research (≥5 distinct searches; cite each source URL
when claiming anything). Cover these axes:

### Axis 1 — Verification techniques for LLM output
What are documented best practices to detect/reduce hallucinated
citations? Recent (2025-2026) papers, blog posts from Anthropic /
OpenAI / DeepMind / academic groups.

### Axis 2 — Prompt engineering against hallucination
Specific prompt patterns that demonstrably reduce hallucinated
URLs / dates / quotes. Cite the studies showing % reduction.

### Axis 3 — Tool-use validation patterns
How do production agent frameworks (Anthropic SDK, LangChain,
LlamaIndex, etc.) validate tool outputs? What's the standard
"check the citation actually exists" mechanism?

### Axis 4 — Self-hallucination detection
Can a model assess its own confidence on a fact? Recent research
on calibration / confidence scores / "I don't know" elicitation.

### Axis 5 — Multi-voice cross-check patterns
For adversarial fan-out (4 voices), what's the optimal way to
catch when one voice hallucinates? Specifically: should I require
each voice to provide citations, then verify URLs before
synthesis? What's the false-positive rate of URL verification?

## Output shape

For each of the 5 axes:
- **Finding**: 1-3 sentence summary
- **Sources**: 2-3 URLs you actually visited (not training-data
  recall). Include date of access if obvious.
- **Confidence**: how solid is the consensus?
- **Operational rule** (1 line): how the project could use this

End with:
- **Your top 3 anti-hallucination rules** ranked by leverage
- **Your own self-bias note**: family overlap if your model is
  Google / Anthropic / OpenAI

## Hard constraint

If you cannot find a source for a claim via real search, say
"NOT FOUND — could not verify". Do NOT fall back to training-data
recall. This is a defining test — the entire point of this brief
is to break the "confabulate plausible citation" reflex.

500-800 words. Be specific. Real URLs only.
