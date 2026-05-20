# Brief: validate 3 Google services picks + find what's missed

Synthesizer (Claude) has 3 picks from Vertex AI for highest-leverage
allocation of $265 GCP credit (90-day expiration). Asking 4 voices to
**adversarially validate**.

## Today's already-burned brainstorms (avoid framing repeats)

1. gem-call-strategy → C+ hybrid (helpers.sh changes)
2. gem-model-strategy → refined S3 (gem/gem-pro/gem-pro-escalate)
3. google-api-possibilities → today's decision stood; only OpenAI-compat
   endpoint was new
4. gcp-credit-allocation → 5-lane hybrid burn (90-day forced E)

This is round 5 today on Google space. **Today's framing flaw record:**
3-voice consensus on "Vertex AI free tier" was empirically WRONG; only
verified by WebFetch on `cloud.google.com/free/docs/...`. Voices invent
plausible API endpoints under specificity pressure.

## Verified facts (web-fetched today)

Vertex AI Model Garden offers (real, confirmed via docs page):
- **Anthropic**: Claude Opus 4.7, Sonnet 4.6, Sonnet 4.5, Haiku 4.5
- **xAI**: Grok 4.1 Fast, Grok 4.20
- **Mistral**: Medium 3, Small 3.1, Codestral 2, OCR
- **Meta**: Llama 4 Maverick, Scout, Llama 3.3

Vertex AI services (truncated WebFetch — names confirmed but
specifics not):
- Embeddings API, Vector Search, Prompt Optimizer, Evaluation Service,
  Agent Builder / Reasoning Engine, Tuning, Document AI

## Claude's 3 picks (challenge these)

1. **Vertex AI Anthropic Claude** — add Claude as fan-out voice
   independent from Claude orchestrator. ~$10-15 over 90 days.
2. **Vertex AI Embeddings API** — fill bridge's missing embedding tier
   for `diff-semantic-index` tool. Local oMLX has no embedding model.
3. **Vertex AI Prompt Optimizer** — automated prompt-tuning for our 6
   tools (summarize/extract/classify/transform/diff-index/summarize-
   long-chunked).

## Project context

`local-mcp-toolbelt` is an Apache-2.0 MCP server delegating
summarize/extract/classify/transform to oMLX (Qwen3 on Apple Silicon).
v0.7+ planned: shipped `omcp install` command. Workflow: ~16
adversarial brainstorm voice calls/day, no agent/RAG today.

## Your task

1. **Rank Claude's 3 picks** by actual leverage for THIS project (1=top,
   3=bottom). Justify in one sentence each.
2. **Propose 1-2 services Claude missed** that should be ABOVE one of
   the 3 picks. Be specific: cite the exact service name only if you
   can vouch it's documented somewhere; flag "uncertain" otherwise.
3. **Attack the top pick** with a concrete failure mode tied to our
   project (MCP server delegating to oMLX, 16GB Mac, 90-day GCP
   credit, $265 cap, no paid upgrade).
4. **Flag any pick that's a misframe**: e.g. "you don't need cloud
   embeddings, you need a local MLX embedding model" or similar.
5. **Self-bias note**: if your family is Google or Anthropic, disclose
   pro-ecosystem lean explicitly.

200-400 words. Comment body only. Be honest about uncertainty rather
than inventing specifics. Today's verification step caught 3 voices
fabricating endpoint names.
