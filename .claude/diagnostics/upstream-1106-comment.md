Adding a sibling data point to this cluster — same SIGABRT family, **different originator stack**.

## Environment

- Apple M-series, **16 GB** unified memory (smaller than the M1 Max 64 GB in the OP)
- macOS 15.7.5
- oMLX versions reproducing: **0.3.8 stable** AND **HEAD-3d62ea0** (built post-#1126/#1146/#1101)
- Workload: a local MCP bridge (Apache-2.0, `local-mcp-toolbelt`) calling Qwen3-{4B-Instruct-2507, 8B, 14B}-4bit through the OpenAI-compatible `/v1/chat/completions` endpoint
- SSD cache: enabled (default) but **not in the fault path** — see stack below

## Stack — distinct from `_extract_tensor_bytes`

Faulting thread aborts through a Metal **command-buffer completion handler**, not through `paged_ssd_cache.save_block`:

```
mlx::core::gpu::check_error(MTL::CommandBuffer*)  ← throws here
  invocation function for block in MTL::CommandBuffer::addCompletedHandler(...)
  __cxa_throw → std::__terminate → abort()
```

Reproduced 3 times this week, uptime-to-crash 16-60 s. HEAD-3d62ea0 (#1126 OOM guard + #1146 `async_eval` cache-store + #1101 hot-cache flush) **reduces** the trigger rate (short-output classify-class calls now pass clean) but does NOT close the path — long-decode `transform` calls (1200-token output cap) reliably re-abort with the same top-of-stack.

## Suggested unified fix

Both this leg and the `_extract_tensor_bytes` leg in the OP look like instances of one broader pattern: an unguarded MLX-thrown C++ exception escapes a Python-side thread that has no `try { … } catch (...) { }`. Wrapping the calls that can raise from MLX (`mlx::core::gpu::check_error`, `MTL::CommandBuffer` completion-handler bodies, the SSD writer’s tensor-serialize path) in a single Python-bound C++ shim that translates exceptions into HTTP 5xx / structured error messages would close both surfaces at once — rather than patching them path-by-path.

This is also more forgiving for downstream consumers: today the abort kills the inflight HTTP request entirely (`fetch failed` / `terminated` on the client side, depending on whether headers were already sent). A translated 5xx is recoverable; an abort is not.

## Other crash reports with no stack in the body

Without seeing the attached `crash.log` files I can't tell whether #947, #1040, and #1178 fall into this leg or the OP's leg, but the symptom pattern (sudden process death under MLX inference workload) is consistent with one of the two.

---

Happy to share the 3 `.ips` crash reports (one for each of our 3 reproductions) if that would help triage; they show the identical `mlx::core::gpu::check_error` top-of-stack across both oMLX 0.3.8 and HEAD-3d62ea0.
