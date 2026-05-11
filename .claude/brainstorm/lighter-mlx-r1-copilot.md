Running parallel web fetches to gather concrete evidence from the listed repositories and Apple docs (will fetch READMEs/commit pages and docs for mlx-swift, mlx-swift-examples, ggerganov/llama.cpp, mlx-rs, and Apple Foundation Models). Also reporting intent: "Researching LLM server alternatives".

● Fetching web content https://developer.apple.com/documentation/foundationmodels · url: "https://d…
  └ Failed to simplify HTML to markdown. Here is the raw content:

✗ Fetching web content https://github.com/david-bouyssie/mlx-rs · url: "https://github.com/david-bo…
  └ Error: Failed to fetch https://github.com/david-bouyssie/mlx-rs - status
    code 404

✗ Fetching web content https://github.com/david-bouyssie/mlx-rs/commits/main · url: "https://github…
  └ Error: Failed to fetch https://github.com/david-bouyssie/mlx-rs/commits/main
    - status code 404

● Fetching web content https://github.com/ml-explore/mlx-swift · url: "https://github.com/ml-explor…
  └ Contents of https://github.com/ml-explore/mlx-swift:

● Fetching web content https://github.com/ggerganov/llama.cpp/commits/main · url: "https://github.c…
  └ Contents of https://github.com/ggerganov/llama.cpp/commits/main:

● Fetching web content https://github.com/ml-explore/mlx-swift-examples · url: "https://github.com/…
  └ Contents of https://github.com/ml-explore/mlx-swift-examples:

● Fetching web content https://github.com/ggerganov/llama.cpp · url: "https://github.com/ggerganov/…
  └ Contents of https://github.com/ggerganov/llama.cpp:

● Fetching web content https://developer.apple.com/wwdc25/136597 · url: "https://developer.apple.co…
  └ Contents of https://developer.apple.com/wwdc25/136597:

● Fetching web content https://github.com/ml-explore/mlx-swift/commits/main · url: "https://github.…
  └ Contents of https://github.com/ml-explore/mlx-swift/commits/main:

● Fetching web content https://raw.githubusercontent.com/ml-explore/mlx-swift-examples/main/Tools/l…
  └ Content type text/plain; charset=utf-8 cannot be simplified to markdown....

● Fetching web content https://github.com/ml-explore/mlx-swift-lm · url: "https://github.com/ml-exp…
  └ Contents of https://github.com/ml-explore/mlx-swift-lm:

● Fetching web content https://github.com/ggml-org/llama.cpp/search?q=json_schema&type=code · url: …
  └ Contents of https://github.com/ggml-org/llama.cpp/search?q=json_schema&t...

● Fetching web content https://www.bing.com/search?q=llama.cpp+json_schema · url: "https://www.bing…
  └ Contents of https://www.bing.com/search?q=llama.cpp+json_schema:

✗ Fetching web content https://github.com/ggml-org/llama.cpp/blob/master/docs/llama-server.md · url…
  └ Error: Failed to fetch
    https://github.com/ggml-org/llama.cpp/blob/master/docs/llama-server.md -
    status code 404

● Fetching web content https://raw.githubusercontent.com/ggml-org/llama.cpp/master/README.md · url:…
  └ Content type text/plain; charset=utf-8 cannot be simplified to markdown....

● Fetching web content https://github.com/ggml-org/llama.cpp/issues/9291 · url: "https://github.com…
  └ Contents of https://github.com/ggml-org/llama.cpp/issues/9291:

● Fetching web content https://www.bing.com/search?q=llama-server+json_schema+openai+structured+out…
  └ Contents of https://www.bing.com/search?q=llama-server+json_schema+opena...

● Fetching web content https://github.com/ggml-org/llama.cpp/search?q=structured+output&type=code ·…
  └ Contents of https://github.com/ggml-org/llama.cpp/search?q=structured+ou...

● Fetching web content https://www.bing.com/search?q=mlx-rs+mlx+rust+david-bouyssie · url: "https:/…
  └ Contents of https://www.bing.com/search?q=mlx-rs+mlx+rust+david-bouyssie:

● Fetching web content https://www.bing.com/search?q=mlx-rs+github · url: "https://www.bing.com/sea…
  └ Contents of https://www.bing.com/search?q=mlx-rs+github:

● Fetching web content https://github.com/ml-explore/mlx-swift-lm/search?q=cache&unscoped_q=cache ·…
  └ Contents of https://github.com/ml-explore/mlx-swift-lm/search?q=cache&un...

Q1 — mlx-swift / mlx-swift-examples — usable LLM HTTP server?
Verdict: Demo/SDK-level (Swift API + examples); no production OpenAI-compatible HTTP server out‑of‑the‑box or explicit json_schema strict-mode server example.
- Evidence
  - Repo + docs: https://github.com/ml-explore/mlx-swift — Swift API for MLX; examples (MLXChatExample, llm-tool) show CLI/Xcode chat apps (README, examples) (commits active through May 2026). (src: mlx-swift README & commits: https://github.com/ml-explore/mlx-swift, commits page May 7, 2026)
  - Examples show a CLI chat tool and chat session API (mlx-swift-examples llm-tool README; supports chat, --model, --cache-size) but no provided HTTP server or /v1/chat/completions endpoint in examples: https://raw.githubusercontent.com/ml-explore/mlx-swift-examples/main/Tools/llm-tool/README.md
  - MLX Swift LM offers LLM runtime APIs (MLXLLM/ChatSession) so a custom HTTP server could be implemented in Swift, but that’s custom work (mlx-swift-lm: https://github.com/ml-explore/mlx-swift-lm).
- What I don't know
  - Whether MLX Swift includes a maintained, production-grade, OpenAI-compatible HTTP server extension (no evidence in READMEs); whether it implements OpenAI json_schema strict enforcement or SSD‑backed KV cache persistence identical to oMLX.

Q2 — llama.cpp (llama-server) — Metal + grammar status
Verdict: Full-featured OpenAI‑compatible server (llama-server) with rapid feature additions (tools/tool_choice, OAI stream compat), but no clear native implementation of OpenAI “json_schema strict mode” (enum+required enforcement) equivalent to oMLX.
- Evidence
  - Official project with an OpenAI-compatible server: README documents llama-server and “Launch OpenAI-compatible API server” (ggml-org/llama.cpp README) — https://github.com/ggml-org/llama.cpp
  - API changelog / issue tracking shows additions for tools/tool_choice and OAI stream events (#9639, issue https://github.com/ggml-org/llama.cpp/issues/9291) and many server API PRs (model load/unload, multimodal, etc.).
  - Metal/Apple‑silicon first‑class support documented (Metal backend, Apple silicon optimizations) — README and build docs.
- What I don't know
  - I could not find authoritative repo text claiming support for OpenAI “json_schema strict mode” (the schema-enforced structured-output spec). Llama-server supports tool-calling and has grammar/templating features, but strict schema enforcement (enum+required enforced at decode time) like oMLX’s json_schema appears not documented.
  - KV cache persistence across requests on Metal (SSD spill/paged KV cache) is not clearly documented as matching oMLX’s persistent KV + SSD spill — may require additional tooling.

Q3 — Apple Foundation Models framework (WWDC25)
Verdict: Apple’s Foundation Models framework provides programmatic on‑device model APIs with structured output & tool‑calling features; it appears oriented toward Apple‑provided on‑device models (not a drop‑in loader for arbitrary Hugging Face MLX weights).
- Evidence
  - Apple docs: “Foundation Models | Apple Developer Documentation” — describes models that “specialize in language understanding, structured output, and tool calling” (developer.apple.com docs page).
  - WWDC25 content: sessions “Meet the Foundation Models framework”, “Explore prompt design & safety for on‑device foundation models”, and a code‑along (WWDC session listing) — https://developer.apple.com/wwdc25/ (search results include sessions 248/286/259/301).
  - Apple highlights MLX and MLX examples in WWDC materials (WWDC index lists MLX-related sessions).
- What I don't know
  - Whether the Foundation Models framework allows loading arbitrary third‑party quantized Hugging Face/MLX weights (Qwen3/others). Apple typically ships curated on‑device models and provides APIs for them; explicit public support for arbitrary user-supplied GGUF/quant weights is not clearly documented in the pages fetched.

Q4 — mlx-rs (Rust binding) — maturity
Verdict: No reachable david‑bouyssie/mlx-rs repo found (404); public mlx‑Rust binding appears either not present under that path or not maintained — maturity appears low / unknown.
- Evidence
  - Direct repo fetch failed: https://github.com/david-bouyssie/mlx-rs returned 404 (attempted fetch).
  - Search for “mlx-rs”/“mlx rust” finds MLX and MLX ecosystem references but not a maintained mlx‑rs canonical project; primary MLX work is in Swift/Python (MLX, mlx-swift, mlx-lm).
- What I don't know
  - Whether a private/renamed mlx‑rs exists elsewhere or an active Rust binding is under a different org; whether an active community fork provides tokenizer + json_schema features. Public evidence is lacking.

Recommendation (concise table)

| Path | Replaces Python? | Effort | Risk vs oMLX |
|---|---:|---:|---|
| mlx-swift (Swift MLX SDK + examples) | Partial — replaces Python runtime but no turnkey OpenAI HTTP server | Medium — build custom Swift HTTP server + implement json_schema enforcement + persistence | Medium — native Metal + Apple integration, but you must implement server/schema/persistence features yourself |
| llama.cpp / llama-server (C/C++) | Largely — no Python runtime; OpenAI‑compatible server exists | Low–Medium — server available; may need glue for strict json_schema & persistent KV | Medium — production‑grade, active, Apple Metal optimized; structured‑schema enforcement unclear |
| Apple FoundationModels | No (replaces need for Python runtime if Apple models suffice) | Low–High depending on allowed models — trivial if using Apple models; high if you must run third‑party weights | Low if using Apple models; High if you require third‑party model support (might be unsupported) |
| mlx-rs (Rust) | Unknown / No evidence | Unknown / Potentially High (if you build it) | High — no public maturity evidence; building full feature parity is significant work |

Sources / links cited above
- mlx-swift README & examples: https://github.com/ml-explore/mlx-swift ; examples: https://github.com/ml-explore/mlx-swift-examples and llm-tool README (raw) https://raw.githubusercontent.com/ml-explore/mlx-swift-examples/main/Tools/llm-tool/README.md
- mlx-swift-lm docs: https://github.com/ml-explore/mlx-swift-lm
- llama.cpp README & server notes: https://github.com/ggml-org/llama.cpp and API changelog issue https://github.com/ggml-org/llama.cpp/issues/9291 (PR refs: #9639 etc.)
- Apple Foundation Models / WWDC25 pages: https://developer.apple.com/documentation/foundationmodels and WWDC session listings (WWDC25)
- mlx-rs repo fetch returned 404 for https://github.com/david-bouyssie/mlx-rs (no public repo at that path)

Honest final note: for strict json_schema (enum + required enforced at decode time), oMLX currently provides that feature in its HTTP backend (json_schema strict); the open‑source alternatives surveyed either lack documented, identical strict‑mode behavior (llama.cpp) or are SDKs requiring custom work (mlx‑swift), while Apple’s FoundationModels offers structured-output APIs but likely tied to Apple‑packaged models. If strict schema + KV persistence + multi‑tier hot_cache are non‑negotiable, continuing with oMLX (upgrade to patched release) while prototyping a Swift or C++ server as a Python‑free backup is the pragmatic path.


Changes   +0 -0
Requests  1 Premium (2m 31s)
Tokens    ↑ 735.0k • ↓ 6.1k • 672.3k (cached) • 3.0k (reasoning)
