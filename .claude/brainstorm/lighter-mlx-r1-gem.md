Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
Attempt 1 failed: You have exhausted your capacity on this model. Your quota will reset after 2s.. Retrying after 5849ms...
Attempt 1 failed: You have exhausted your capacity on this model. Your quota will reset after 2s.. Retrying after 5221ms...
Attempt 1 failed: You have exhausted your capacity on this model. Your quota will reset after 2s.. Retrying after 5421ms...
Attempt 1 failed: You have exhausted your capacity on this model. Your quota will reset after 2s.. Retrying after 5174ms...
Attempt 1 failed: You have exhausted your capacity on this model. Your quota will reset after 1s.. Retrying after 5969ms...
## Q1: mlx-swift / mlx-swift-examples
**Verdict:** While `ml-explore/mlx-swift-examples` provides a working Vapor-based HTTP server, it acts as a foundation rather than a production-ready, feature-complete drop-in replacement.
*   **Server & KV Cache:** The repo contains a basic Vapor LLM server example. It features robust KV cache implementations (`KVCacheSimple`, `RotatingKVCache`, `QuantizedKVCache`) natively.
*   **JSON Schema Constraints:** It lacks native JSON schema or grammar-constrained output APIs. Developers must manually implement custom `LogitsProcessor` routines or state machines to mask invalid tokens.
*   **Multi-model Swap:** The HTTP examples load a single model at startup; there is no built-in OpenAI-compatible router mode for hot-swapping models via API requests.
*   *What I don't know:* Whether any recent, unmerged community forks have successfully bolted an OpenAI-compatible router and `xgrammar` integration directly into the Swift examples.

## Q2: llama.cpp (llama-server)
**Verdict:** `llama-server` is a highly capable C++ drop-in replacement with excellent feature parity, but it is not entirely immune to Metal backend crashes.
*   **Grammar & Strict Mode:** Fully supports OpenAI's `response_format` with `strict: true`. It converts the JSON schema into a GGML BNF (GBNF) grammar for zero-violation constrained decoding.
*   **KV Cache & Hot-Swap:** Natively retains KV cache in continuous batching slots between requests. It supports "Router Mode" (via `--model-dir`) to automatically hot-swap and LRU-evict multiple GGUF models on demand based on the requested `model` in the API payload.
*   **Stability:** Recent tracker issues show Metal backend `SIGABRT` crashes still occur on Apple Silicon, specifically assertion failures during `ggml_metal_device_free` on process exit and occasional texture synchronization issues under heavy load.

## Q3: Apple Foundation Models framework (WWDC25)
**Verdict:** This is an app-level Swift API for integrating AI into native Apple applications, making it fundamentally the wrong architecture for a local HTTP toolbelt server.
*   **Open-Weight Support:** The framework supports user-supplied models (like Qwen or Llama) by allowing developers to wrap them in custom providers that conform to the unified `LanguageModel` protocol.
*   **API & Schema:** It provides programmatic API access (not just system UI overlays). It supports strict structured output via the `@Generable` macro, which forces models to output Swift types (JSON-equivalents).
*   *What I don't know:* The exact memory overhead and performance latency of routing a local, third-party model through the OS-level `FoundationModels` framework compared to running bare MLX.

## Q4: mlx-rs (Rust binding)
**Verdict:** `mlx-rs` offers mature Rust bindings to Apple's MLX C API, but migrating to it requires building a custom HTTP server and grammar engine from scratch.
*   **Inference & Tokenizer:** The primary repository (`oxideai/mlx-rs`) handles core inference. It does not reinvent tokenization, relying entirely on the Hugging Face `tokenizers` crate for `tokenizer.json` integration.
*   **Grammar Constraints:** Structured output is not natively built into `mlx-rs`. To enforce JSON schema, you must manually compile the schema and integrate a grammar engine (like `xgrammar-rs`) to mask logits in your custom sampling loop.
*   **Activity:** It is actively maintained with inference examples, but mostly serves as a low-level dependency for higher-level engines (like `mistral.rs`) rather than a standalone, ready-to-use OpenAI server.

| Path | Replaces Python? | Effort | Risk vs oMLX |
| :--- | :--- | :--- | :--- |
| **mlx-swift** | Yes (Swift) | High (Build server/grammar) | High (Missing routing/schemas) |
| **llama-server** | Yes (C++) | Low (Drop-in GGUF server) | Medium (Format change, rare Metal aborts) |
| **Foundation Models**| Yes (Swift) | Very High (Wrong architecture)| High (App API, not HTTP server) |
| **mlx-rs** | Yes (Rust) | High (Build server/grammar) | High (Low-level DIY inference) |
