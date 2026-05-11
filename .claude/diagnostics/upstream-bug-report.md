# oMLX upstream bug report — uncaught MLX Metal exception → process abort

**Target:** https://github.com/jundot/omlx
**Reporter:** rd (local-mcp-toolbelt project, 2026-05-11)
**oMLX version observed:** 0.3.8 (built from source 2026-05-07)
**MLX framework:** as bundled with oMLX 0.3.8

## Summary

`mlx::core::gpu::check_error(MTL::CommandBuffer*)` throws a C++ exception
when the Metal command buffer reports an error. oMLX's Python wrapper does
not install a `catch` handler for this path, so any GPU-side error
propagates through `__cxa_throw → std::__terminate → abort()`, killing the
whole `omlx serve` process. `launchd` then auto-restarts the service.

## Reproducibility

Observed twice on the same machine, ~16 hours apart, with similar workloads.

### Crash 1 — 2026-05-10 18:53:07
- Process uptime before crash: **60 s**
- Signal: SIGABRT
- Same top-of-stack pattern (faulting thread 24)

### Crash 2 — 2026-05-11 10:06:11
- Process uptime before crash: **17 s**
- Signal: SIGABRT
- Stack reveals MLX symbol clearly:

```
__pthread_kill
pthread_kill
raise
faulthandler_fatal_error
_sigtramp
pthread_kill
abort
abort_message
demangling_terminate_handler()
_objc_terminate()
std::__terminate(void (*)())
__cxxabiv1::failed_throw(__cxxabiv1::__cxa_exception*)
__cxa_throw
mlx::core::gpu::check_error(MTL::CommandBuffer*) + 244     ← origin
invocation function for block in MTL::CommandBuffer::addCompletedHandler(...)
```

Termination indicator: `Abort trap: 6` (`SIGNAL` namespace, code 6).
`asi: {"libsystem_c.dylib":["abort() called"]}`.

## Environment

- Hardware: MacBookPro18,1 (M1 Pro family), **16 GB unified memory**
- OS: macOS 15.7.5 (24G624)
- Python: 3.11.15 (Homebrew bottle)
- oMLX install: `brew install jundot/omlx/omlx` (stable 0.3.8)

## Workload at time of crash

Bridge stress test of the v0.5.0 release of local-mcp-toolbelt:

1. `hot_cache_max_size` raised from `4GB` to `10GB` in `~/.omlx/settings.json`
2. Service restarted via `brew services restart`
3. Three consecutive `Qwen3-14B-4bit` inference calls (cold + 2× warm) —
   succeeded
4. Phase 1 evaluation started via external CLI (gem agentic) issuing
   multi-tier alternation: `Qwen3-4B-Instruct-2507-4bit` →
   `Qwen3-8B-4bit` → `Qwen3-14B-4bit`
5. System memory pressure was elevated at the time:
   - Pages free: ~170 MB
   - Swap used: ~3.5 GB / 5 GB
6. Crash 2 occurred ~17 s after a tier switch onto 14B

System recovered cleanly on launchd-driven restart, but in-flight client
requests were severed.

## Hypothesised cause

A Metal command buffer reaches an error state — most plausibly a transient
allocation failure under memory pressure, or a CommandBuffer scheduling
fault during model swap — and `mlx::core::gpu::check_error` correctly
detects it and throws. oMLX's wrapper around the completion handler block
has no `try { } catch (...) { }` around the call path, so an MLX exception
escapes to libc++'s default terminate handler and crashes the entire
inference server.

## Suggested fix

Wrap MLX completion-handler invocations in oMLX's request-handling layer:

```cpp
// pseudo, in the oMLX completion-block path
try {
    mlx::core::gpu::check_error(commandBuffer);
} catch (const std::exception& e) {
    log_error("MLX GPU error on completion: %s", e.what());
    // Return 503 / streaming error to the in-flight HTTP client
    // so it can retry instead of getting a connection reset
    return error_response(e.what());
} catch (...) {
    log_error("Unknown MLX GPU error on completion");
    return error_response("internal MLX error");
}
```

This converts an unrecoverable crash into a recoverable HTTP 5xx — clients
(like local-mcp-toolbelt's MlxHttpBackend) already retry/abort cleanly on
HTTP errors.

## Attached artifacts (kept locally, can share on request)

- `.claude/diagnostics/oMLX-crash-100611.ips` (89 KB Apple `.ips` JSON)
- `.claude/diagnostics/oMLX-crash-185307.ips` (94 KB Apple `.ips` JSON)

## Side note (config that triggers it)

Setting `hot_cache_max_size` to a value >50 % of unified memory on a 16 GB
machine appears to be a reliable amplifier; rolling back to `6GB` (so the
hot weights + system + bridge process + Claude Code stay under ~13 GB
resident) has not triggered the abort in the smoke test so far. The bug is
in the unhandled-exception path, not in caching policy, but the caching
policy makes hitting the bug more likely.
