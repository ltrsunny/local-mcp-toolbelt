# Eval harness — v0.5.0 oMLX

Per-tier latency + quality + RAM evaluation against a real oMLX server.
Documented in
[`docs/scope-memos/v0.5.0-shipped-2026-05-10.md`](../../../../docs/scope-memos/v0.5.0-shipped-2026-05-10.md)
(open follow-up F1).

## Layout

```
tests/eval/
├── fixtures/
│   ├── 01-summarize-long/         # 20K-word doc → structured summary
│   ├── 02-summarize-long-chunked/ # 60K-token transcript → outline
│   ├── 03-classify/               # ambiguous text + 6-label taxonomy
│   ├── 04-extract/                # nested research metadata (flat schema)
│   └── 05-transform/              # meeting notes → action-items
│       ├── meta.json              # kind, style, instruction, etc.
│       ├── input.<ext>            # source text
│       ├── gold.<ext>             # reference answer (Opus-authored)
│       ├── categories.json        # classify only
│       └── schema.json            # extract only
├── lib/
│   ├── invoke.mjs                 # in-process wrappers — mirrors src/mcp/server.ts
│   │                              # system prompts AND MAX_OUTPUT_TOKENS caps
│   ├── ram.mjs                    # ps -p $$ -o rss= polling at 100ms
│   └── results.mjs                # flat JSONL store, lm-eval-harness style
├── runs/                          # gitignored — JSONL outputs
├── runner.mjs                     # iterate fixtures × trials, capture metrics
├── judge.mjs                      # Anthropic API scoring against gold
└── report.mjs                     # markdown matrix from one or more run files
```

## Prerequisites

The runner talks to oMLX over HTTP. **Start oMLX first**:

```bash
brew services start jundot/omlx/omlx
# Verify:
curl -s localhost:8000/v1/models | jq '.data[].id'
```

Models referenced by `DEFAULT_CONFIG` must already be present under
`~/.omlx/models/`. Install them once via:

```bash
npm run download-models
```

## Workflow

```bash
# 0. build (runner imports compiled dist/)
npm run build

# 1. run a tier end-to-end
node tests/eval/runner.mjs \
  --mlx-url http://127.0.0.1:8000 \
  --mlx-model Qwen3-4B-Instruct-2507-4bit \
  --ctx 8192 \
  --tasks all \
  --trials 5

# 2. judge it
ANTHROPIC_API_KEY=sk-... node tests/eval/judge.mjs \
  --run tests/eval/runs/<id>.jsonl

# 3. report (multi-file aggregate)
node tests/eval/report.mjs tests/eval/runs/*.jsonl \
  > docs/notes/v0.6.0-eval-$(date +%Y%m%d).md
```

The runner accepts `--mlx-url` / `--mlx-model` for the v0.5.0 oMLX path.
The legacy `--model <gguf-path>` flag is gone with the llama.cpp backend.

## Tier validation criteria (v0.5.0+)

A tier configuration is considered **validated** only if:

- mean judge score ≥ **4.0/5.0** across the 5 fixtures
- 95p latency on tasks 01/03/04/05 < **55 s** (MCP wall budget is 60 s;
  5 s headroom for HTTP overhead)
- peak RAM (server-side oMLX + bridge process) < **12 GB**
  (4 GB headroom on a 16 GB Mac)
- schema-constrained tasks (03 classify, 04 extract): structurally valid
  output on every trial (no parse errors after
  `MlxHttpBackend.normalizeForStrictMode`)

`report.mjs` computes the verdict automatically.

## Adding a fixture

Each `fixtures/<id>/meta.json`:

```json
{
  "kind": "summarize-long" | "classify" | "extract" | "transform",
  "input_file": "input.txt",
  "gold_file": "gold.md",
  "style": "1-2 sentence lead + 3-6 bullets",
  "instruction": "(transform) e.g. 'rewrite as action items with owners'",
  "allow_multiple": false,
  "explain": false,
  "categories_file": "categories.json",
  "schema_file": "schema.json",
  "instance_id": "default",
  "source_url": "<http(s):// origin used to author this fixture>",
  "license": "<source license, e.g. CC-BY-4.0 or PD>"
}
```

## Notes

- **In-process invocation, not stdio MCP**: the eval measures *the model
  on the same prompt that the bridge sends*, not the MCP wrapper. The
  MCP framing has its own contract test
  (`tests/unit/migration-snapshot.test.ts`).
- **`/no_think` injection**: `lib/invoke.mjs` does NOT append `/no_think`
  itself — that happens in `MlxHttpBackend.chat()` for the production
  path. The eval calls `MlxHttpBackend` from `dist/` so the runner
  exercises the same suffix-injection production uses.
- **RAM measurement**: `ram.mjs` polls `ps -p $$ -o rss=` for the runner
  process. This includes the local Node heap but NOT the oMLX server
  RAM. To capture full RAM, also poll the oMLX Python process:

  ```bash
  ps -ax -o pid,rss,command | grep omlx | grep -v grep
  ```

- **Model swap**: oMLX serves multiple models from one process. To eval
  another tier, change `--mlx-model` and re-run. The previous v0.4.0
  llama.cpp note about "load one model, dispose on exit" no longer
  applies — oMLX manages model residency itself.
- **Judge variance**: for tighter agreement, run `--trials 5` and report
  median score per (model × task). The v0.5.0 promotion criteria use
  mean across trials; median is more robust to outliers.
