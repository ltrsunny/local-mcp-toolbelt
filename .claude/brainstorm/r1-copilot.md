1) Two‑tier pipeline: fast-approx then background refine
- Description: On every MCP call run a small/fast model (or heuristic extractor) that produces a coherent, useful short answer within 60s and return that immediately. Spawn the long Tier‑C/14B job in background; subsequent Claude polls (same job-id) receive progressively refined outputs until final. This makes every MCP response satisfy Claude’s 60s wall while still delivering full results eventually.
- Assumption: A smaller local model or deterministic heuristic can produce an acceptable initial result fast.
- Worst‑case failure: Initial approximation is misleading/low quality and users act on it; background refine adds latency and duplicate cognitive load.
- Cost: M

2) Deterministic resumable map‑reduce orchestration
- Description: Redesign long tools as a deterministic map→reduce pipeline: split input into many sub‑chunks that each finish well under 60s, persist intermediate artifacts and a deterministic plan, then run serial reduces until final. MCP responses return intermediate merged outputs fast; Claude polls to fetch the latest stage. The orchestration makes long jobs resumable and inspectable.
- Assumption: Target tasks are decomposable into independent chunks whose local results can be meaningfully merged.
- Worst‑case failure: Non‑decomposable inputs (cohesive discourse) degrade quality; orchestration overhead and I/O blow up latency/complexity.
- Cost: L

3) Backend generation snapshot / resume (model‑state checkpointing)
- Description: Add support in the bridge/backend to checkpoint model generation state (partial latent/state/streamed token cursor) and resume across multiple MCP requests so each request advances generation for ~50s then returns a placeholder plus job-id. Claude re-calls to advance/resume; the bridge resumes from saved state until completion without redoing earlier work.
- Assumption: The LLM backend (oMLX/MlxHttpBackend) can be coerced to produce and restore resumable generation state, or the server can emulate it by replaying partial outputs cheaply.
- Worst‑case failure: Backend cannot snapshot/resume; emulation requires re-running expensive work (no savings), or introduces correctness bugs; brittle across backend versions.
- Cost: L

Ranking (top→bottom)
1) Two‑tier pipeline — best tradeoff: practical, minimal infra change, immediate wins for UX.  
2) Resumable map‑reduce orchestration — robust for many workloads but high engineering cost and not universally applicable.  
3) Snapshot/resume — conceptually elegant (no polling semantics change) but backend dependent and high risk/porting cost.


Changes   +0 -0
Requests  1 Premium (42s)
Tokens    ↑ 19.0k • ↓ 2.4k • 2.6k (cached) • 1.9k (reasoning)
