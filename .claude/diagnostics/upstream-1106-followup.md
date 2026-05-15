Thanks for the leg classification and the lock-fix details for the OP's path.

Three follow-up observations on the `mlx::core::gpu::check_error` leg:

**1. Crash rate dropped notably on HEAD-3d62ea0.** Pre-upgrade (0.3.8 stable) the trigger was near-100 % on a single 1200-token `transform` decode (we got an abort within 17 s of bridge load every time). On HEAD I had to push it: 5 sequential 14B + thinking-on transform calls, each 65–78 s wall, and got 0 reproductions today. So whatever's reducing the race window in `mlx::core::gpu::check_error`'s callers (possibly the same store-cache materialization async-eval rework, or just a narrower memory-pressure window) is helping even though the unguarded throw is still there. Wanted to flag this in case it informs the "follow up separately" diagnosis.

**2. Historical faulthandler stderr was lost across the crash → launchd-restart cycle.** `~/Library/LaunchAgents/homebrew.mxcl.omlx.plist` puts both StandardOutPath and StandardErrorPath at `/opt/homebrew/var/log/omlx.log` (single file, no rotation flags); the file between the abort and the next brew-services start no longer contains the Python-level frames. I've now set up a persistent `tail -F` mirror to a path that survives launchd restarts, so the next abort I observe will have the full faulthandler dump captured cleanly. Will post it back to this thread when it lands.

**3. macOS-level `.ips` stacks from the three crashes I did observe** — sharing here in case it helps anyone reading the cluster. Identical top-of-stack across oMLX 0.3.8 stable AND HEAD-3d62ea0:

```
faulthandler_fatal_error               ← faulthandler did fire to stderr,
                                          but that stderr is what got lost
raise → abort → abort_message
demangling_terminate_handler → _objc_terminate
std::__terminate → __cxxabiv1::failed_throw
__cxa_throw
mlx::core::gpu::check_error(MTL::CommandBuffer*)   ← throws here
invocation function for block in
  MTL::CommandBuffer::addCompletedHandler(std::__1::function<void (MTL::CommandBuffer*)> const&)
MTLDispatchListApply
-[_MTLCommandBuffer didCompleteWithStartTime:endTime:error:]
-[IOGPUMetalCommandBuffer didCompleteWithStartTime:endTime:error:]
```

Uptime-to-crash 16–60 s on each occurrence. Workload was Qwen3-4B-Instruct-2507-4bit `transform` with 1200-token output cap on a 16 GB Mac (hot_cache_max_size = 6 GB after I rolled back from 10 GB which seemed to amplify the trigger). The faulting thread alternated between thread 1 and thread 24 in the three reports — suggests the throw site isn't pinned to a specific worker; that fits the "Metal command-buffer completion-handler block runs on whichever thread dispatched it" reading.

I'll follow up here as soon as the next abort gives me a clean faulthandler trace.
