**1. Chunked Streaming via Partial Results (Simulated Async)
1.**  
Break long operations into incremental result chunks returned across multiple 45s windows. Each `wait_for_job` returns a status + partial output, letting Claude re-poll efficiently.

*Assumption:* Work can be decomposed into resumable units.  
*Failure:* Final result delayed or incomplete if chunks exceed call limits.  
*Cost:* M

**2. Pre-chunking Input (Defensive Sizing)
2.**  
Pre-slice large inputs into smaller units before processing, aligning each with <60s runtime expectations, avoiding timeout through input constraint.

*Assumption:* Problem size is roughly predictable and divisible.  
*Failure:* Sub-chunking failsafe must exist; large docs may still breach per chunk.  
*Cost:* S

**3. Internal Timeout Handoff (Cooperative Timeout Bridge)
3.**  
MCP server tracks job progress internally. If nearing timeout, return control early to serialize within 60s window via staged commit or early return.

*Assumption:* Predictable internal timing and state checkpointing is feasible.  
*Failure:* Incomplete state handoff under complex jobs may cause data inconsistency.  
*Cost:* L

**Ranking:**  
**1. Chunked Streaming**: Most elegant — uses existing protocol limits elegantly.  
**2. Pre-chunking**: Broad applicability but needs precise workload insight.  
**3. Internal timeout handoff**: Most complex — high implementation cost, error-prone.
