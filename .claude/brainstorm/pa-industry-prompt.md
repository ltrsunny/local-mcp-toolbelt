RESEARCH TASK: industry patterns for long-running RPC under a fixed
request timeout. NOT MCP-specific — broader engineering literature.

SETTING: client makes RPC call. Server's work takes 30-300s.
Client's request timeout is hardcoded short (e.g. 60s). What patterns
has the industry developed to bridge this gap?

LIST 5-7 PATTERNS from real systems you know. For each:
- Pattern name + one-line description
- Real systems that use it (Temporal, AWS Step Functions, Cadence,
  Celery, Sidekiq, BullMQ, gRPC server-streaming, GraphQL subs,
  Kafka Streams, Flink, HTTP 202+Location polling, WebSocket/SSE,
  email callbacks, S3 multipart upload, etc.)
- Key tradeoff (latency, complexity, state mgmt cost, failure semantics)
- When to NOT use it

ENDPOINT MATTERS: pay extra attention to patterns where the CLIENT
controls retry (cannot expect server-push). Our problem is server-push
is not available (MCP transport is request-response only).

OUTPUT FORMAT: markdown, ~600 words total. Direct prose, no preamble.

After listing patterns, give a 50-word recommendation: which 2-3 patterns
most likely apply to a 60s-RPC-timeout + 30-300s work scenario where the
client is an LLM (Claude Code) that needs the answer eventually.

This feeds v0.6.0 Prior Art Review for an MCP server project.
