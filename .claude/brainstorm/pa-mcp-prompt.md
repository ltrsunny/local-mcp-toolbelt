RESEARCH TASK for v0.6.0 of local-mcp-toolbelt (Apache-2.0 MCP server).

CONTEXT: Claude Code's MCP request timeout is hardcoded ~60s wall-clock.
This blocks long-running model inference (Tier D 14B can need 30-300s).
v0.3.0 of our project added enqueue-job/wait_for_job/read_job_result —
but wait_for_job itself caps at 45s, so it just relocates the problem.
A 4-AI brainstorm converged on filesystem-as-return-channel + a heartbeat
tool (check_progress). Before designing v0.6.0 we need Prior Art.

FIND: 3-5 existing open-source MCP servers (or analogous RPC servers
with the same short-request-timeout constraint) that handle long-running
work. Use `gh search repos`, `gh search code`, `gh issue` commands.

For each candidate, return ~150 words with:
- Repo URL
- Approach (file-based handoff? streaming? checkpointing? background daemon?
  HTTP 202 + polling? webhooks? SSE?)
- Why this approach was chosen (their docs / issue history)
- Tradeoffs they ran into (issues filed, postmortems)

PRIORITIES for candidate selection:
- modelcontextprotocol/* repos (canonical MCP)
- mcp-server-* repos with >10 stars and active issues
- Inference servers (vllm, ollama, llama.cpp server) — same problem
  domain (long inference under client timeout)
- Anthropic tools that wrap long-running work

EXCLUDE: hypothetical patterns, blog posts, marketing pages.
INCLUDE only: real running code we can read.

NO speculation about whether each pattern would work for us —
that's my synthesis job. Just describe what THEY did.

OUTPUT: save markdown to
/Users/rd/ollama-claude/docs/prior-art/v0.6.0-mcp-async-2026-05-11-copilot.md
(create the directory if needed)

Use --allow-all-tools. --effort xhigh.
