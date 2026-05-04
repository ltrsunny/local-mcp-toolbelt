# ollama-mcp-bridge

Universal MCP server that bridges any MCP client (Claude Desktop, Cursor, Cline,
Zed, …) to a local LLM. Lets the frontier assistant delegate lightweight tasks
to a small local model — summarising, classifying, extracting structured data,
diffing commits — so its token budget is preserved for reasoning that actually
requires frontier capability.

Data stays on your machine. Works offline once models are downloaded.

**v0.4.0+ runs on [llama.cpp](https://github.com/ggml-org/llama.cpp) directly via
`node-llama-cpp`** — no daemon, no separate process, in-process inference. The
deprecated Ollama path is retained for one minor version for backward
compatibility (see ethical context:
<https://sleepingrobots.com/dreams/stop-using-ollama/>).

## Tools (v0.3.0)

### Delegation tools (synchronous)

| Tool | Tier | Use case |
|---|---|---|
| `summarize` | B (qwen3:4b) | Short text ≤ ~2 K words |
| `summarize-long` | C (qwen2.5:7b, num_ctx=32 K) | Up to ~25 K words |
| `summarize-long-chunked` | C | Any length — map-reduce; use for > 25 K words |
| `classify` | B | Grammar-constrained label from a list |
| `extract` | B | Grammar-constrained JSON from a user-supplied schema |
| `transform` | B | Free-form rewrite / translation |
| `diff-semantic-index` | B | `git diff` → typed JSON (change_type, files, decisions, risks) |

All tools accept `source_uri: "file:///..." | "https://..."` to read source
from disk or the web instead of passing inline `text`. This is the only path
that actually saves frontier tokens (inline text is already in your context).

### Async-job tools (v0.3.0)

Use these when a synchronous tool call would hit Claude Code's ~60 s MCP wall:

| Tool | Purpose |
|---|---|
| `enqueue-job` | Submit a tool call as a background job; get a `job_id` immediately |
| `wait_for_job` | Long-poll (cap 45 s) until the job finishes; re-call if still running |
| `read_job_result` | Fetch the persisted result body for a done job |

Jobs are stored in `.memory/jobs/` and persist across bridge restarts. Default
TTL 7 days. Identical `(tool_name, args)` while a job is inflight returns the
existing `job_id` (dedup).

## Setup (Claude Desktop / Claude Code)

### Recommended: llama.cpp backend (v0.4.0+)

1. Download a GGUF model for each tier — for example:

   ```bash
   mkdir -p ~/.ollama-mcp-bridge/models
   # Tier B (small/fast): Qwen 3 7B at Q4_K_M (~5 GB)
   curl -L -o ~/.ollama-mcp-bridge/models/qwen3-7b-instruct.Q4_K_M.gguf \
     https://huggingface.co/Qwen/Qwen3-7B-Instruct-GGUF/resolve/main/qwen3-7b-instruct.Q4_K_M.gguf
   # Tier C (long-context): Qwen 3.5 8B-9B class — see docs/scope-memos for verified May 2026 list
   ```

2. Configure your MCP client:

   ```jsonc
   // ~/Library/Application Support/Claude/claude_desktop_config.json
   {
     "mcpServers": {
       "ollama-bridge": {
         "command": "node",
         "args": [
           "/path/to/packages/core/dist/bin/cli.js",
           "serve",
           "--tier-b-path", "/Users/you/.ollama-mcp-bridge/models/qwen3-7b-instruct.Q4_K_M.gguf",
           "--tier-c-path", "/Users/you/.ollama-mcp-bridge/models/qwen3.5-9b.Q4_K_M.gguf"
         ]
       }
     }
   }
   ```

   Or use environment variables `OMCP_TIER_B_PATH` / `OMCP_TIER_C_PATH`.

The first call loads the GGUF into memory + initializes Metal (~5–15 s on
Apple Silicon). Subsequent calls reuse the loaded model.

### Deprecated: Ollama backend (v0.3.x compatibility)

```jsonc
{
  "mcpServers": {
    "ollama-bridge": {
      "command": "node",
      "args": ["/path/to/packages/core/dist/bin/cli.js", "serve"]
    }
  }
}
```

```bash
ollama pull qwen3:4b      # Tier B
ollama pull qwen2.5:7b    # Tier C
```

The Ollama path will be removed in v0.5.0.

## CLI

```bash
ollama-mcp hardware          # hardware info (GPU, RAM, detected limits)
ollama-mcp models            # Ollama daemon status + installed models
ollama-mcp config            # effective bridge config (tiers + routing)
ollama-mcp serve             # run the MCP bridge server over stdio
```

## Slash commands (`.claude/commands/`)

After cloning the repo, `.claude/commands/draft-from-diff.md` is available as
`/draft-from-diff` in Claude Code. It:
1. Captures the staged diff (falls back to unstaged).
2. Saves to `/tmp/omcp-diff-<ts>.txt` and calls `diff-semantic-index` via `source_uri`.
3. Composes a conventional-commit message from the returned JSON.

## Environment variables

| Variable | Default | Effect |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama daemon address |
| `OMCP_MEMORY_DIR` | `$CWD/.memory/jobs` | Job persistence directory |
| `OMCP_JOB_CONCURRENCY` | `1` | Parallel job limit (Ollama serializes on Metal) |
| `OMCP_WAIT_CAP_MS` | `45000` | Maximum `wait_for_job` poll window (≤ 50 000) |
| `OMCP_CHUNK_SIZE` | `2000` | Token target per chunk (chunked summarizer) |
| `OMCP_CHUNK_OVERLAP` | `200` | Overlap between adjacent chunks |
| `OMCP_CHUNK_CONCURRENCY` | `2` | MAP fan-out cap |

## Development

```bash
npm test                       # 134 unit tests (no Ollama required)
node tests/smoke-bridge.mjs    # end-to-end smoke (needs qwen3:4b + qwen2.5:7b)
npm run build                  # tsc → dist/
```

## License

Apache-2.0. See the project root [`LICENSE`](../../LICENSE) and
[`NOTICE`](../../NOTICE) for attributions.
