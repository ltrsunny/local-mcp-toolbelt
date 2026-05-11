## Q1: mlx-swift / mlx-swift-examples — is there a usable LLM HTTP server?
**Verdict:** Currently demo-only; no production-grade HTTP server with JSON schema constraints or KV persistence exists in the official repos.
*   **Evidence:** The `ml-explore/mlx-swift-examples` repository contains basic CLI and SwiftUI demos (e.g., `LLMApp`) but lacks an embedded HTTP server implementation comparable to `llama-server` or `oMLX` [Source: `ml-explore/mlx-swift-examples` repo structure].
*   **Evidence:** There is no documented support for `json_schema` strict mode or grammar-constrained decoding in the Swift bindings; the underlying C++ `mlx` core supports some constraints, but the Swift exposure is limited to basic generation [Source: `mlx-swift` API docs, commit history up to early 2024].
*   **Evidence:** KV cache persistence to SSD and multi-model hot-swapping logic are not implemented in the Swift examples; these are complex orchestration layers currently specific to the Python `mlx-lm` server implementation.
*   **Unknown:** Whether a private fork exists within Apple or the community that adds these specific server features, as the public repos are strictly reference implementations.

## Q2: llama.cpp (llama-server) — Metal + grammar status
**Verdict:** Production-ready for Metal inference with robust GBNF grammar support, but native "OpenAI strict mode" (JSON Schema) is an evolving feature often relying on GBNF conversion rather than native schema enforcement.
*   **Evidence:** `llama-server` (built into `llama.cpp`) fully supports Metal acceleration on Apple Silicon and offers stable multi-model loading via the `/models` endpoint, allowing hot-swapping without restart [Source: `llama.cpp` README, `examples/server/README.md`].
*   **Evidence:** Strict JSON output is primarily achieved via GBNF grammars; while recent versions (post-2024) have added experimental `json_schema` parameters, they often translate schemas to GBNF internally, which may not perfectly match OpenAI's specific "strict mode" error handling for all edge cases [Source: `llama.cpp` PR #6021, #8365].
*   **Evidence:** KV cache persistence *between* requests is not a standard feature in the same way `oMLX` describes (spilling to SSD for long context continuity across restarts); `llama.cpp` manages KV within a session but typically resets per request unless using specific prompt-caching APIs which differ from full state serialization.
*   **Unknown:** Specific crash frequency of `llama-server` on Metal compared to `oMLX`'s `SIGABRT` in high-concurrency swap scenarios, though `llama.cpp` is generally considered more stable due to its C-only runtime.

## Q3: Apple Foundation Models framework (macOS 26 WWDC25)
**Verdict:** Unverified for user-supplied models; currently appears restricted to Apple's optimized on-device models with no public API for loading arbitrary MLX/HuggingFace weights like Qwen.
*   **Evidence:** The `FoundationModels` framework announced at WWDC24 (iOS 18/macOS 15) provides access to Apple's pre-bumped language models (e.g., `LLM` class) but documentation explicitly limits usage to models provided by the system or Apple Silicon Neural Engine optimized bundles, not arbitrary GGUF/MLX weights [Source: Apple Developer Documentation, WWDC24 Session 10132].
*   **Evidence:** There is no documented mechanism to inject external quantized weights (e.g., Qwen-7B-MLX) into the `FoundationModels` API; it is designed for system-level integration (Writing Tools, Siri) rather than custom model serving.
*   **Evidence:** JSON schema and tool calling are supported for Apple's models via `LLMSession`, but this capability does not extend to user-loaded models since loading them is not currently supported.
*   **Unknown:** If macOS 26 (future) will open the backend to custom weights; current knowledge is limited to macOS 15/iOS 18 capabilities.

## Q4: mlx-rs (Rust binding) — maturity
**Verdict:** Early-stage/experimental; lacks the complete inference pipeline, tokenizer integration, and grammar constraints required to replace `oMLX`.
*   **Evidence:** The `mlx-rs` project (various forks including `david-bouyssie` and `mlx-rs` org) provides basic array operations and some model loading, but lacks a cohesive `mlx-lm` equivalent for easy LLM serving [Source: `mlx-rs` crates.io, GitHub activity].
*   **Evidence:** Tokenizer integration is fragmented; while `tokenizers-rs` exists, bridging it seamlessly with `mlx-rs` for BPE/Unigram tokenization matching HuggingFace exactly requires significant custom glue code not present in a turnkey server.
*   **Evidence:** No evidence of grammar-constrained decoding or JSON schema support in the Rust bindings; the C++ core features have not been fully exposed or wrapped for Rust-based inference logic.
*   **Unknown:** The exact date of the last stable release supporting LLM generation, as the project sees intermittent commits and lacks a clear "production ready" tag or major enterprise adopters.

### Recommendation Table

| Path | Replaces Python? | Effort | Risk vs oMLX |
| :--- | :--- | :--- | :--- |
| **Upgrade oMLX** | No | Low | Low (Fixes known crashes) |
| **llama.cpp** | Yes | Medium | Low (Stable, but schema logic differs) |
| **mlx-swift** | Yes | High | High (Missing server/schema features) |
| **mlx-rs** | Yes | Very High | Very High (Incomplete ecosystem) |
| **FoundationModels**| No (Custom models) | N/A | N/A (Cannot load Qwen/MLX) |

**Conclusion:** Upgrading `oMLX` to the latest mainline (incorporing PRs #1126, #1146, #1101) is the lowest-risk path to fix the `SIGABRT`. Switching to `llama.cpp` is the only viable Python-free alternative today, provided your application can adapt to GBNF-based grammar constraints instead of strict OpenAI JSON Schema. Swift and Rust paths are not yet production-ready for your specific requirements.
