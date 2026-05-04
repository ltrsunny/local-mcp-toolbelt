# Prior Art Review: llama.cpp Backend (Remove Ollama Dependency)

**Date**: 2026-05-04  
**Driver**: Ethical/moral requirement to remove Ollama dependency entirely  
**Reviewer**: Claude Sonnet 4.6  
**Status**: Draft — pending Auditor (user) pass

---

## Scope of the question

Replace `OllamaBackend` (current sole `LlmBackend` implementation) with a backend
that has no runtime dependency on the Ollama daemon or the `ollama` npm package.
Must preserve all existing capabilities:

| Requirement | Current |
|---|---|
| GGUF model loading | via Ollama daemon |
| Metal acceleration (Apple Silicon) | via Ollama daemon |
| GBNF grammar-constrained output | `format: { type: "object", ... }` Ollama API field |
| Per-tool context window (`num_ctx`) | Ollama `options.num_ctx` API field |
| AbortSignal cancellation | Ollama client passes through |
| `countTokens` | Ollama `/api/tokenize` endpoint |
| `ping` | Ollama `/api/version` endpoint |
| Streaming | Ollama stream API (currently unused in MCP tools) |

---

## Candidates reviewed

### 1. `node-llama-cpp` v3 — in-process Node.js bindings

**Source**: https://github.com/withcatai/node-llama-cpp  
**npm**: `node-llama-cpp` v3.18.1 (published 2026-03-17) — active  
**License**: MIT ✅  
**Node requirement**: ≥20 (our project: ≥22) ✅

**Capabilities vs requirements:**

| Requirement | Status | Notes |
|---|---|---|
| GGUF loading | ✅ | Native GGUF via llama.cpp |
| Metal acceleration | ✅ | Default on Apple Silicon |
| GBNF grammar | ✅ | `llama.createGrammarForJsonSchema()` — note: "supports only a small subset of JSON Schema spec" |
| Context window | ⚠️ | Set at **context creation** (`model.createContext({ contextSize })`), not per-call |
| AbortSignal | ✅ | `session.prompt(text, { signal, stopOnAbortSignal: true })` |
| `countTokens` | ✅ | `model.tokenize(text).length` |
| `ping` | ✅ | check `model.disposed` or try-load |
| Streaming | ✅ | async generator |

**Install / size:**
- Unpacked npm package: ~32 MB (base JS + bindings)
- Pre-built Metal binaries downloaded on first install (additional ~50–150 MB depending on platform)
- Falls back to cmake compilation if pre-built binary unavailable
- No separate daemon process required ✅

**Architecture impact on `LlmBackend`:**

The `num_ctx` change is the biggest delta. Currently `OllamaBackend.chat()` passes
`num_ctx` in every request. With `node-llama-cpp`, context size is fixed at
`model.createContext()` time. Mitigation: pre-create one context per tier at
`LlamaCppBackend` construction:
- Tier B: `contextSize: 4096`
- Tier C: `contextSize: 32768`

This is architecturally cleaner; the current per-call `num_ctx` in Ollama is already
functionally per-tier (every Tier C call uses 32 K, every Tier B uses 4 K).

**Grammar subset limitation**: `createGrammarForJsonSchema` only supports a subset of
JSON Schema. Need to verify it covers all schemas used in `extract` and `classify` tools.
The schemas used there are simple flat object shapes — likely fine, but requires a test.

---

### 2. `llama-server` (llama.cpp HTTP daemon)

**Source**: https://github.com/ggml-org/llama.cpp  
**Distribution**: `brew install llama.cpp` (stable formula 8960) ✅  
**License**: MIT ✅

**Capabilities vs requirements:**

| Requirement | Status | Notes |
|---|---|---|
| GGUF loading | ✅ | `-m model.gguf` at startup; router mode for hot-swap |
| Metal acceleration | ✅ | Default on macOS Apple Silicon |
| GBNF grammar | ✅ | `grammar` field in `/v1/chat/completions` request |
| Context window | ⚠️ | Set at startup (`--ctx-size`); `n_predict` is max tokens per call, not window size |
| AbortSignal | ✅ | Passes to `fetch()` naturally |
| `countTokens` | ✅ | `/tokenize` endpoint |
| `ping` | ✅ | `GET /health` |
| Streaming | ✅ | SSE |

**Model management:**
- Default: single model loaded at startup
- Router mode: dynamic load/unload via `/models/load` and `/models/unload` endpoints
- Hot-swap is possible but requires managing model lifecycle explicitly

**Client side**: Cannot use `ollama` npm package. Need to switch to raw `fetch` calls
or an OpenAI-compatible client (e.g., `openai` npm package or raw fetch). The
`openai` npm package is MIT-licensed and speaks `/v1/chat/completions` natively.

**Context window limitation**: context size is a startup flag, not a per-call param.
Running two context sizes (Tier B: 4K, Tier C: 32K) would require two separate
`llama-server` instances. This is a significant operational complexity vs. Ollama.

**Dependency model**: still requires a **separate running daemon** on the user's machine.
Replaces Ollama daemon with llama-server daemon. Removes `ollama` npm dep but keeps
the "you need a running local service" requirement. Users must install llama.cpp
and manage the process themselves (or we provide a wrapper).

---

### 3. `llamafile` (Mozilla AI)

**Source**: https://github.com/mozilla-ai/llamafile  
**License**: Apache-2.0 ✅

Self-contained executables that bundle model weights + llama.cpp inference into a
single file (Cosmopolitan Libc, runs on macOS/Linux/Windows without install).

**Why not suitable:**
- Model weights must be baked in at build time — cannot load arbitrary GGUF files
- Designed for *distribution* of a specific model, not a general inference backend
- No model-agnostic API that maps to our multi-model tier system

**Verdict**: Reject. Architecturally wrong fit for a general-purpose bridge.

---

### 4. `llama-node` (Atome-FE)

**npm**: `llama-node` — last meaningful release ~2023  
**Status**: Unmaintained. No Metal support. Node 16-era API.

**Verdict**: Reject immediately. Dead project.

---

## Comparison matrix

| | node-llama-cpp v3 | llama-server |
|---|---|---|
| Removes `ollama` npm dep | ✅ | ✅ |
| Removes Ollama daemon | ✅ | ❌ (replaces with llama-server) |
| In-process (no daemon) | ✅ | ❌ |
| GBNF grammar | ✅ (subset) | ✅ (full) |
| Per-tier context size | ⚠️ (pre-create contexts) | ⚠️ (two server instances) |
| AbortSignal | ✅ | ✅ |
| User install burden | low (npm handles binaries) | medium (brew + manage process) |
| Code delta | medium (new API surface) | low (swap URL + client) |
| Binary size added | ~100–200 MB | ~50 MB (brew bottle) |
| Daemon process at runtime | none | 1–2 processes |
| Apache-2.0 compat | ✅ | ✅ |

---

## Ethical context (Q1 resolved)

Source: https://sleepingrobots.com/dreams/stop-using-ollama/

The objection is to **Ollama as a company and product** — both daemon and npm package.
Specific charges:
- README omitted llama.cpp attribution for 400+ days; binary distributions omitted
  required MIT license notices; maintainers ignored a compliance GitHub issue for
  over a year
- Forked away from llama.cpp in mid-2025; reintroduced already-solved bugs;
  benchmarks show llama.cpp 1.8x faster on same hardware after the fork
- Misleading model naming (DeepSeek-R1 distills listed without "Distill" prefix)
- Introduced cloud-hosted models without clearly disclosing third-party data routing
- Pattern: build on open-source → minimize attribution → create lock-in → launch
  proprietary components → monetize

The article explicitly recommends **llama.cpp** (the ggml-org project) as the
replacement. Both `node-llama-cpp` and `llama-server` are llama.cpp-based with
proper attribution and MIT licensing — both are ethically acceptable.

**Q1 is closed**: full Ollama removal (daemon + npm package) is the requirement.

## Open questions for Auditor

1. **Grammar subset**: `node-llama-cpp`'s `createGrammarForJsonSchema` supports
   "only a small subset of JSON Schema spec." Do our `extract`/`classify` schemas
   fall within that subset? (Likely yes — they're flat objects — but needs a test.)

2. **Binary size trade-off**: Adding ~100–200 MB of pre-built Metal binaries to the
   package. Is that acceptable for a project where "unpacked dist size ≈ runtime
   cost"? (CLAUDE.md note.)

3. **Context pre-creation**: With `node-llama-cpp`, context size is fixed per
   context object, not per call. Pre-creating one context per tier is the clean
   solution. Acceptable?

---

## Preliminary recommendation

**Primary: `node-llama-cpp` v3** — removes both the Ollama daemon and npm dep,
in-process inference, no daemon management for users. Larger binary footprint is
the main trade-off. Grammar subset needs verification against current schemas.

**Alternative: `llama-server`** — if daemon-based operation is acceptable and minimal
code change is preferred. Still requires users to run a local process.

**Reject**: `llamafile` (wrong fit), `llama-node` (unmaintained).

Recommend proceeding to scope memo after Auditor clarifies Q1 (exact scope of
ethical objection) and Q2 (grammar subset coverage).
