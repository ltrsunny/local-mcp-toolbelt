As promised in my previous comment, the persistent tail captured a clean abort with the following exception:

```
libc++abi: terminating due to uncaught exception of type
  std::runtime_error: [METAL] Command buffer execution failed:
  Insufficient Memory
  (00000008:kIOGPUCommandBufferCallbackErrorOutOfMemory)
```

This error code is the IOGPU layer reporting a Metal command-buffer failure due to insufficient GPU memory. Given the captured .ips and top-of-stack (mlx::core::gpu::check_error → MTL::CommandBuffer completion handler), this points to a GPU-side allocation failure during command-buffer execution rather than host RAM exhaustion.

A few brief questions to narrow next steps:

1) Does kIOGPUCommandBufferCallbackErrorOutOfMemory change the recommended diagnosis or instrumentation approach? In particular, should the mlx::core::gpu::check_error rewrite be expected to handle this gracefully, or is the std::runtime_error throw the only observable signal today?

2) Would a minimal repro (e.g., small text input + strict json_schema on the 4B Qwen3 tier) be useful to provoke the same command-buffer allocation failure, or is the captured trace + .ips + error code sufficient for you to act on?

3) If you want further captures, is there a preferred dtrace probe or an Instruments configuration you’d like run the next time the persistent mirror catches an abort?

Full trace and the macOS .ips are available in my earlier attachments; happy to run any targeted captures you request.