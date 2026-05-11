RESEARCH TASK — lighter MLX server alternatives (avoid Python runtime)

CONTEXT: Our project local-mcp-toolbelt (Apache-2.0, Node 22+ MCP server,
Apple Silicon 16GB Mac dev hw) currently delegates inference to oMLX
(jundot/omlx) which is a Python 3.11 process. oMLX 0.3.8 has hit
SIGABRT crashes — uncaught C++ exception from `mlx::core::gpu::check_error`
in a Metal command-buffer completion handler. Upstream fixes for related
paths (PR #1126 OOM guard, #1146 async_eval, #1101 hot-cache flush)
landed AFTER our build. We will upgrade, but the question is: should
we plan a Python-free path for stability and weight reduction?

WHAT WE GAIN FROM oMLX TODAY (do not lose):
- OpenAI-compatible HTTP /v1/chat/completions
- json_schema strict mode for grammar-constrained classify/extract
- KV cache persistence across requests + SSD spill
- Tier B/C/D model swapping via hot_cache
- HuggingFace model loading + mlx-lm tokenizer integration

ANSWER THESE 4 QUESTIONS — evidence-based, no speculation.

## Q1: mlx-swift / mlx-swift-examples — is there a usable LLM HTTP server?

- Repos: `ml-explore/mlx-swift`, `ml-explore/mlx-swift-examples`
- Look for: HTTP server example, JSON-schema-constrained output support,
  KV-cache persistence, multi-model swap.
- Verdict: production-grade vs demo-only.

## Q2: llama.cpp (llama-server) — Metal + grammar status

- Does `llama-server` support OpenAI Structured Outputs strict mode
  (json_schema with enum + required enforcement), or only GBNF?
- Does it offer KV cache persistence between requests on Metal?
- Multi-model loading/swap support?
- Stability story on Apple Silicon — known abort modes?

## Q3: Apple Foundation Models framework (macOS 26 WWDC25)

- Can it run user-supplied open-weight models (Qwen3-4B/8B/14B MLX), or
  is it restricted to Apple's bundled models?
- Programmatic access (API, not just system UI)?
- JSON-schema / tool-calling support level?

## Q4: mlx-rs (Rust binding) — maturity

- Repo: `david-bouyssie/mlx-rs` or successor
- LLM inference path (load mlx-community quantized weights + generate)?
- Tokenizer integration (tokenizers-rs)?
- Grammar-constrained output support?
- Last commit / release activity / production users?

## OUTPUT FORMAT

Markdown, ~600 words total. For each Q:
- Direct verdict line (1 sentence)
- 2-3 supporting bullets with concrete evidence (repo URL, commit date,
  documented feature, etc.)
- Honest "what I don't know" if you don't know

Then a closing recommendation table:
| Path | Replaces Python? | Effort | Risk vs oMLX |

No preamble, no marketing fluff. Cite sources.

If you need web/GitHub access use it (gem has web; copilot has gh CLI).
nv_pro / Claude: answer from knowledge base + clearly mark "unverified"
when uncertain.
