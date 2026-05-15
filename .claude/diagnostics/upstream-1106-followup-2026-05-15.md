As promised in my previous comment, the persistent `tail -F` mirror captured the next abort with a clean faulthandler trace. The exception text:

```
libc++abi: terminating due to uncaught exception of type
  std::runtime_error: [METAL] Command buffer execution failed:
  Insufficient Memory
  (00000008:kIOGPUCommandBufferCallbackErrorOutOfMemory)
```

**Trigger** — oMLX HEAD-3d62ea0 (with #1126 / #1146 / #1101 applied), an `extract` call with a 12 KB input on `Qwen3-4B-Instruct-2507-4bit` (numCtx 8192, output cap 2048, strict `json_schema`), 16 GB Mac, `hot_cache_max_size=6GB`. The `.ips` (`Python-2026-05-15-113546.ips`) top-of-stack is identical to the three reports in the previous comment (`mlx::core::gpu::check_error` → `MTL::CommandBuffer` completion handler).

**What the error code points at** — `kIOGPUCommandBufferCallbackErrorOutOfMemory` (IOKit, code 0x00000008) is the IOGPU layer reporting that command-buffer completion failed because the GPU ran out of memory during execution. So the allocation failure happens *inside* the command buffer being retired, on the GPU side — not at the host level (16 GB system had plenty of headroom for a 4B model + 12 KB prefill).

**Open questions** —
1. Does the error code change the diagnosis? Specifically, is a GPU-side allocation failure inside `addCompletedHandler` something the `mlx::core::gpu::check_error` rewrite is expected to recover from gracefully, or is the `std::runtime_error` throw the only signal currently possible?
2. Would a minimal repro on a smaller input (e.g. 500-byte text + strict `json_schema` on the same 4B tier) be useful, or do the captured trace + `.ips` + error code already give you enough to act on?
3. Is there a dtrace probe or an Instruments configuration you'd like me to run the next time the persistent mirror catches an abort?

Happy to run any targeted captures you'd like.
