Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
**1. Macro-Delegation (Autonomous Local Sub-Agent)**
1. **Description:** Shift orchestration out of Claude entirely. The tool accepts a high-level intent, kicks off an independent local LLM sub-agent to handle the long-running map-reduce loop, and immediately returns a destination file path. Claude is instructed to proceed with parallel tasks and check the file later.
2. **Assumption:** Claude can cleanly context-switch to other work or idle gracefully without obsessively trying to read the incomplete file.
3. **Worst-case failure mode:** Claude refuses to pivot, immediately reads the pending file, and hallucinates a completion based on empty or partial data.
4. **Rough engineering cost:** M

**2. Pipelined Continuation (Chunked Iteration)**
1. **Description:** Abandon the opaque async-job triad. Refactor heavy tools to perform a guaranteed maximum of 45 seconds of synchronous work, returning partial results alongside a `continuation_token`. Claude actively loops (e.g., `process_next_chunk`) rather than passively waiting.
2. **Assumption:** Providing tangible, incremental progress on every hop prevents the context degradation and "loop fatigue" caused by empty `wait_for_job` polling.
3. **Worst-case failure mode:** Indivisible bottlenecks (like loading a massive 14B model into Metal memory) still breach the 60-second limit before the first chunk can return.
4. **Rough engineering cost:** L

**3. Shell-Mediated Blocking (The Bash Handoff)**
1. **Description:** Move the blocking wait out of the MCP transport. The tool enqueues the background job and returns a blocking bash one-liner (e.g., `while [ ! -f .result ]; do sleep 5; done; cat .result`). Claude executes this natively via its own bash tool.
2. **Assumption:** Claude Code’s built-in terminal execution tool allows for long-lived processes and lacks the rigid 60-second timeout that governs its MCP client requests.
3. **Worst-case failure mode:** The native bash tool shares the same hard timeout, violently killing the polling script and stranding the background job.
4. **Rough engineering cost:** S

**Ranking**

1. **Macro-Delegation:** Most elegant; it fully removes cognitive load and tool-call waste from Claude by treating the local server as an autonomous peer rather than a dumb function.
2. **Pipelined Continuation:** Structurally sound and keeps Claude anchored with real progress, but still burns context window and limits tool-call efficiency on the iteration.
3. **Shell-Mediated Blocking:** A pragmatic but brittle hack; it perfectly solves the cognitive cost but relies entirely on an undocumented client terminal constraint.
