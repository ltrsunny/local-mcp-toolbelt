# Decision: 3 Google services picks revised — fan-out caught 2 misframes

Date: 2026-05-18
Trigger: User "1" (= run adversarial fan-out on previous 3 Google
service picks)
Voices: gem-pro / nvidia/nemotron-3-nano-omni-30b-a3b-reasoning /
meta/llama-3.2-90b-vision-instruct / mistralai/mixtral-8x22b
Brief: `.claude/brainstorm/google-services-validation-brief-2026-05-18.md`

## Original 3 picks (from Q&A turn, no fan-out)

1. Vertex AI Anthropic Claude — add Claude voice to fan-out
2. Vertex AI Embeddings API — fill missing embedding tier
3. Vertex AI Prompt Optimizer — automate tool prompt tuning

## Two independent misframe catches (high-signal)

### Misframe 1: Anthropic Claude is redundant

Caught by **gem-pro** AND **mixtral-8x22b** independently:
- gem-pro: "redundant voice from same family as orchestrator;
  minimal new perspective"
- mixtral: "may not significantly enhance considering existing
  orchestrator"

**Reframe**: orchestrator is already Claude. Adding cloud Claude
as a fan-out voice produces same-family echo, not adversarial
diversity. Replace with a TRULY different family.

### Misframe 2: Cloud Embeddings betrays local-first ethos

Caught by **gem-pro** AND **mixtral-8x22b** independently:
- gem-pro: "Introducing a hard dependency on a cloud-based
  embedding API makes a core feature fragile and temporary. When
  the $265 credit expires in 90 days, the `diff-semantic-index`
  tool will cease to function entirely. This creates a ticking
  time bomb"
- mixtral: "A local MLX embedding model could be more cost-
  effective and efficient"

**Reframe**: project is local-first MCP toolbelt. Cloud embedding
tier = architectural contradiction. The bridge needs a LOCAL
embedding model — but the **GCP credit is the right tool to
BENCHMARK local candidates** (Compute Engine GPU testing
bge-m3-mlx vs nomic-embed-text-mlx vs others), not to host
embeddings long-term.

## Voice quality grading (for self-protocol)

| Voice | Grade | Signal |
|---|---|---|
| gem-pro | ⭐⭐⭐⭐ | Google self-bias disclosed; caught both misframes; specific Llama 4 Maverick alternative |
| mixtral-8x22b | ⭐⭐⭐⭐ | Independent confirmation of Embeddings misframe; clean ranking |
| llama-3.2-90b-vision | ⭐⭐ | Rationales swapped between picks (#1 rationale matches #2's pick); vision-tuned model weak at strategic text reasoning |
| nemotron-3-nano-30b-reasoning | ⭐ | Off-topic — proposed LangChain and "RAG-System" as missed Google services; reasoning model but didn't follow brief |

**Process learning**: vision-instruct or reasoning-prefix models
may not be good at multi-axis strategic reasoning briefs. Future
fan-out: smoke for brief-compliance with one warmup question
before committing.

## Revised 3 picks

### 1. Vertex AI Evaluation Service (NEW pick, displaces Prompt Optimizer to #2 or below)
- Managed eval framework: measure summarize/extract/classify/
  transform output quality
- **Prerequisite to Prompt Optimizer** — automated tuning needs
  a quality signal; eval provides it
- Augments `packages/core/tests/eval/` local harness
- Estimated burn: $30-50 over 90 days (one-shot eval rounds)

### 2. Vertex AI **Llama 4 Maverick OR Grok 4.20** (replaces Anthropic Claude)
- Truly different vendor family vs orchestrator (Claude)
- Llama 4 Maverick = Meta architecture; Grok = xAI different RL
  approach
- Either gives adversarial fan-out a 4th non-Claude / non-NIM
  vendor pool
- Pick ONE via smoke benchmark in first week
- Estimated burn: $15-25 over 90 days at our workload

### 3. Compute Engine GPU spike for local MLX embedding benchmark (replaces Cloud Embeddings API)
- Test candidate local embedding models: `bge-m3-mlx`,
  `nomic-embed-text-mlx`, `Qwen3-Embedding-*-mlx`
- One-shot benchmark on cloud GPU (don't have local hardware to
  test fairly)
- Ship the winner as bridge's new embedding tier — local, free,
  no credit expiration risk
- Estimated burn: $40-60 (a few hours of L4/T4 GPU time)

### Demoted: Prompt Optimizer
- Defer until eval framework (#1) lands
- Without eval signal, optimizer's tuning is unfounded — could
  optimize toward wrong target

## Updated GCP credit allocation (revised Lane 2)

Previous Lane 2: ~15% (~$40) on Vertex Model Garden generic
diversity. **Refine**:

- Lane 2a — Llama 4 / Grok voice (new diverse family): $20
- Lane 2b — Anthropic Claude (DROPPED, see misframe 1): $0
- Lane 1 — Vertex Gemini 2.5-pro migration: unchanged $80
- **Lane 3 narrows to**: embedding model benchmark only, $50
  (was $65 mix; trim by 15)
- **Lane 4** — Cloud Run install demo: unchanged ~$40
- **Lane Eval — NEW**: Vertex AI Evaluation Service: $40 (carved
  from Lane 5 reserve)
- Lane 5 reserve: $30 (down from $40)

Total: 80 + 20 + 50 + 40 + 40 + 30 = $260 ≈ $265 ✓

## Other genuinely-missed services flagged

| Service | Why considered | Decision |
|---|---|---|
| Vertex AI Agent Builder / Reasoning Engine | gem-pro path adjacent to v0.7+ scope | Defer to v0.8+ — overlaps our `omcp install` product |
| Vertex AI Vector Search | gem-pro pairing with embeddings | Skip — our use case is small enough for in-memory index, don't need managed vector DB |
| Vertex AI Document AI | llama-90b uncertain | Defer — bridge doesn't ship PDF tool in v0.7 |
| Cloud Translation | not mentioned by any voice | Skip |

## Process learnings codified

Add to `auditor-protocol.md` memory:

1. **Local-first projects should reject cloud-only embedding /
   indexing dependencies** unless explicitly accepted. The
   misframe arises from "we have credit so use cloud" — a
   sunk-cost-style framing flaw. Cloud credit windows expire;
   local artifacts persist.
2. **Same-family voices in fan-out = redundant**. If orchestrator
   is Claude, adding Claude as a fan-out voice doesn't add
   adversarial diversity. Verified 2× independent today.
3. **Voice quality varies — pre-smoke for brief compliance.**
   Vision-tuned and short-context models can mangle multi-axis
   strategic reasoning. Warmup test before fan-out helps filter.

## Voice logs
- `tmp/gempro-services-validation.log` (⭐⭐⭐⭐ best)
- `tmp/mixtral-services-validation.log` (⭐⭐⭐⭐)
- `tmp/llama-90b-services-validation.log` (⭐⭐)
- `tmp/nemotron-reasoning-services-validation.log` (⭐)
