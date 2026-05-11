# R1 — Claude (claude-opus-4-7)

Written from knowledge-base only; no live web/gh queries by me. "Unverified"
marks where my confidence is low.

## Q1: mlx-swift / mlx-swift-examples — HTTP server?

**Verdict: demo-only, not a drop-in oMLX replacement.**

- `ml-explore/mlx-swift` exists (Swift bindings to C++ MLX core).
  `ml-explore/mlx-swift-examples` has LLM generation demos but, to my
  knowledge, **no built-in HTTP server example**. Mostly SwiftUI / CLI
  scratch projects.
- What's missing for a port: KV-cache-persistence-across-requests,
  grammar engine (xgrammar/outlines equivalent), multi-model hot-swap,
  HuggingFace tokenizer integration (Swift's `tokenizers-swift` is
  young — unverified maturity).
- If you build it: Vapor or SwiftNIO server + mlx-swift inference +
  `tokenizers-swift` + write your own strict-mode JSON schema engine.
  That's ~3-6 weeks of solid Swift engineering, not days.

## Q2: llama.cpp / llama-server — Metal + grammar status

**Verdict: production-grade. We had it in v0.4.0; the dependency is
already familiar; Ollama uses it under the hood.**

- `llama-server` is C++, no Python in process. Metal backend has been
  mainline since 2023; tens of thousands of production users.
- Grammar: **GBNF native**; OpenAI Structured Outputs `json_schema` is
  accepted via auto-conversion to GBNF (verified in v0.4.0 of our own
  project). Strict-mode enforcement comparable to oMLX's xgrammar.
- KV cache: per-request by default but `slot` mechanism gives prompt
  caching across requests (cache hit on shared prefix). Less integrated
  than oMLX's SSD spill but workable.
- Multi-model: **NOT natively** — one process = one model. Reproducing
  our B/C/D tier swap means running 3 server processes on 3 ports OR
  paying cold-load every tier switch. (Our v0.4.0 ran one server per tier.)
- Stability: this is the strongest argument. Battle-tested vs oMLX's
  recent abort surface.

## Q3: Apple Foundation Models framework (macOS 26 / WWDC25)

**Verdict: does NOT fit our use case — model selection is locked to
Apple's bundled small models.**

- Released WWDC25 (2025-06). Foundation Models framework exposes
  Apple's on-device Foundation model (~3B params, unverified exact size).
- **You cannot load Qwen3-14B-4bit** or any user-supplied weight. It's
  Apple's model, period.
- Has `@Generable` macro for structured output — nice DX but irrelevant
  if we can't bring our own model.
- For our quality requirement (Qwen3-14B for Tier D), Apple's small
  model is too far behind. Pass.

## Q4: mlx-rs (Rust binding) — maturity

**Verdict: experimental community work; not suitable for production
this year.** Confidence: low — I haven't tracked this closely.

- `david-bouyssie/mlx-rs` or similar exists. Unverified whether there's
  a primary canonical fork.
- LLM inference loop: I'm not aware of a Rust mlx-lm equivalent — you'd
  rebuild the generation loop, sampler, KV cache logic.
- Tokenizers: HF `tokenizers` crate is solid; integration with mlx-rs
  is plausible but unverified.
- No production users I know of.

## Recommendation

| Path | Replaces Python? | Effort | Risk vs oMLX | Verdict |
|---|---|---|---|---|
| oMLX upgrade + circuit-breaker | ❌ | XS-S | LOWER (fixes known abort + retry on launchd restart) | **Ship now** |
| llama-server fallback (3 procs) | ✅ | M | Lower stability risk; loses multi-model elegance | **Keep as Plan B**, evaluate alongside v0.6.0 eval |
| mlx-swift custom server | ✅ | L-XL | Highest engineering risk (greenfield) | Defer until v0.7+ |
| Apple Foundation Models | ❌ for us | N/A | Doesn't fit (model selection locked) | Skip |
| mlx-rs | ✅ | XL | Highest (still experimental) | Skip this year |

**My ordering: 1 (oMLX upgrade) > 2 (llama.cpp fallback) > others.**

The honest story: **Python isn't the real problem — the unprotected
`check_error` exception is.** Replacing the runtime is a 10× heavier
intervention than wrapping that one call site (which oMLX upstream
should do, see our bug-report draft). The "lighter" framing is
tempting but mostly bikeshedding unless oMLX upstream refuses to fix it.

**However**: keeping `LlamaCppBackend` git history alive (we already
deleted it in v0.5.0 — but the commits are reachable) is cheap
insurance. If oMLX abort recurs after upgrade, having llama-server as
a hot fallback is real value.

---

## ADDENDUM — reframing (user correction, 2026-05-11)

User clarified: **the core reason we chose oMLX is its cache benefit
to Claude itself**, not the json_schema strict mode or multi-model
swap. oMLX is not the only option as long as the replacement gives the
same cache leverage.

Concrete reading: oMLX's **SSD-backed KV / prefix cache** is the load-
bearing feature. When the bridge reissues calls with the same system
prompt + similar user prefix (very common — `summarize` system prompt
is identical across calls), oMLX cache-hits the prefix and skips
prefill. SSD spill means a long warm prefix isn't evicted under 16GB
RAM pressure.

This re-prioritizes the comparison:

| Engine | Prefix cache? | SSD spill? | Verdict for OUR use |
|---|---|---|---|
| oMLX | ✅ | ✅ | Current; valued for SSD spill |
| llama-server | ✅ (slot mechanism) | ❌ | Loses key advantage under RAM pressure |
| mlx-swift (custom) | ❌ unless built | ❌ unless built | Greenfield, no cache layer |
| vLLM (Mac port unverified) | ✅ (PagedAttention) | partial | Linux-first; verify Metal/Mac viability |
| LiteLLM proxy over llama-server | depends on backend | ❌ | Adds protocol layer, no cache help |

The replaceability bar is therefore: **the alternative must either
(a) match oMLX's SSD-spilled prefix cache, or (b) come with an
auxiliary cache layer we write/host ourselves on top of a stable
engine.**

**Updated recommendation given the corrected framing:**

1. Short-term: oMLX upgrade + circuit-breaker (unchanged — fastest
   restoration of the cache feature we already have).
2. **Medium-term**: write a thin **OpenAI-compatible cache-proxy** that
   sits in front of llama-server and provides SSD-backed prefix
   storage. This decouples our stability story (llama-server is the
   stable engine) from our cache story (proxy holds the cache).
3. Long-term: still watch mlx-swift and Apple Foundation Models, but
   they were never the right comparison for *this* problem.

Note for R2 synthesis: this lens dominates the original Q1-Q4 axes —
the multi-model-swap and json_schema features are nice-to-haves;
SSD-spilled cache is the one we paid for.

---

## ADDENDUM-2 — second user correction (2026-05-11)

User added: **MLX was chosen specifically for Apple-Silicon optimization**
(unified memory + Metal kernels native, not just "uses Metal").

Combined constraints for any replacement: (a) MLX-ecosystem native +
(b) cache benefit for Claude.

This eliminates llama.cpp from contention — it uses Metal but isn't an
MLX wrapper, so it loses the framework-level optimization MLX provides.
Apple Foundation Models is locked to Apple's bundled models. The real
candidate set shrinks to MLX-ecosystem wrappers only:

| Candidate | MLX-ecosystem? | Cache layer | Verdict |
|---|---|---|---|
| **oMLX (Python)** | ✅ | ✅ SSD-spilled | Current |
| **mlx-swift** | ✅ | ❌ build it ourselves | Greenfield |
| **mlx-rs** | ✅ | ❌ build it ourselves | Experimental |
| llama.cpp | ❌ (Metal ≠ MLX) | ❌ slot only | **OFF-table** |
| Apple Foundation Models | ✅ (model locked) | ❌ | OFF-table |

So the real question is **NOT** "should we leave Python" but **"is
there a lighter MLX wrapper than oMLX that still gives us the SSD-
spilled prefix cache, or would we have to write the cache layer
ourselves on top of mlx-swift / mlx-rs?"**.

Revised recommendation:

1. **Short-term, unchanged**: oMLX upgrade + circuit-breaker. Stays in
   MLX ecosystem, keeps cache benefit, fixes known crash.
2. **Medium-term (replaces my earlier llama-server proposal)**:
   evaluate `mlx-swift` + a custom HTTP server + minimal SSD-prefix-
   cache module. This is a much heavier engineering bet than the
   llama-server route, but it stays in MLX-native territory and gives
   us a process-stable (no uncaught-Python-exception) abort surface.
3. **The "lighter" framing thus mostly resolves to "wait for oMLX
   upstream to stabilize, then revisit Swift port only if abort
   pattern returns."** Don't write a Swift server now.
