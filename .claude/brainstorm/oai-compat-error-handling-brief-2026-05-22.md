# Brief: robust OpenAI-compat client error handling — REAL web research

You are 1 of N voices tasked with REAL web research (NOT training-data
recall) on how production OpenAI-compatible API clients handle the full
failure-mode spectrum. Multiple searches required; cite working URLs.

## Context

We have 2 picker functions (`_nim_pick_model`, `_ghm_pick_model`) and
2 call paths (NIM via `nv_sum`/`nv_pro`; GHM via `_ghm_call`). All
target OpenAI-compatible /chat/completions endpoints. Today's
empirical failures (2026-05-22):

| Gateway | Model | Failure mode |
|---------|-------|--------------|
| GHM     | deepseek/deepseek-v3-0324 | returns empty content WITHOUT max_tokens |
| GHM     | microsoft/phi-4 | intermittent empty content with long prompts |
| GHM     | (any high-tier model) | rate-limit returns plain-text body "Too many requests..." (non-JSON) |
| GHM     | openai/gpt-4.1-nano | hits finish_reason="length" silently truncates |
| NIM     | qwen/qwen3-coder-480b | returns empty content for non-code prompts |
| NIM     | openai/gpt-oss-120b | returns empty intermittently |
| NIM     | meta/llama2-70b | HTTPError (likely deprecated) |
| NIM     | (any) | catalog 40-70% 404 daily |

GHM's `_ghm_call` was upgraded 2026-05-22 with **non-JSON body
detection** + **empty-content stderr message**. NIM picker (`nv_sum`,
`nv_pro`) STILL has bare error handling:
```bash
| python3 -c "import sys,json; d=json.load(sys.stdin); print(d['choices'][0]['message']['content'])"
```
Crashes silently on any of: missing 'choices', empty 'message', content=None,
non-JSON body, finish_reason='length'/'content_filter'.

## Research questions

### Q1 — Production OpenAI-compat failure-mode taxonomy
What's the canonical list of failure modes for OpenAI Chat
Completions calls (and proxies / Azure OpenAI / vLLM / NIM / GitHub
Models)? Specifically: HTTP-level (4xx, 5xx, timeouts, redirects),
body-level (non-JSON, malformed JSON), choice-level (empty array,
missing message, content=None, finish_reason!=stop), and content-
level (empty string, refusal text, off-topic).

### Q2 — Detection patterns in production frameworks
How do LangChain, LiteLLM, LlamaIndex, and the openai-python SDK
detect each category? Specifically: do they re-raise typed exceptions
per failure mode, or just bubble up generic ones? Cite actual files
in their repos.

### Q3 — Retry-vs-surface policy
When should the CLIENT auto-retry (with backoff / different model /
modified prompt) vs surface to caller? Specifically:
- Empty content → retry with different model?
- finish_reason=length → retry with bigger max_tokens?
- finish_reason=content_filter → never retry, surface (could leak PII)
- Non-JSON body → never retry (likely rate-limited, fail fast)
- 5xx → exponential backoff retry

### Q4 — "Ping" reliability for picker design
Our picker pings each candidate with `messages:[{"role":"user","content":"say hi"}], max_tokens:5`. This fails:
- qwen3-coder still pings OK on "say hi" but returns empty on
  longer non-code prompts (code-specialized model behavior)
- gpt-oss pings OK sometimes but real call returns empty

Should the ping use a REPRESENTATIVE prompt (e.g. "summarize 1
sentence") instead of "say hi"? Is there prior art on "model
liveness probe" patterns?

### Q5 — Unified picker / call abstraction
NIM and GHM pickers are ~80% duplicate (catalog fetch + filter +
shuffle + ping). Worth refactoring into one `_oai_pick_model` with
provider adapters? Or does the abstraction cost more than the dup?

## Hard constraint

Real URLs only. If you cannot verify a claim via real search, say
"NOT FOUND — could not verify". DO NOT fall back to training-data
confabulation. Today's earlier session caught gem (gemini-3.5-flash)
fabricating "Accessed February 2026" provenance for URLs — same
failure mode this brief is trying to design AROUND. Don't do it
in this brief either.

## Output shape (≤700 words)

For each Q (1-5):
- **Finding**: 1-3 sentences
- **Sources**: 2-3 cited URLs you actually visited
- **Confidence**: solid / weak / NOT FOUND
- **Operational rule**: 1 line — concrete patch direction

End with:
- **Top-2 recommended patches** (specific, file:line)
- **Self-bias note** (family overlap)

Hard constraint: REAL URLs ONLY. Say NOT FOUND if unverifiable.
