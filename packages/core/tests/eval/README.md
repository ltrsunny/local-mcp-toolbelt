# Eval harness — Tier-D candidate evaluation

Implementation of the methodology in
[`docs/scope-memos/v0.4.0-larger-models-eval-2026-05-04.md`](../../../docs/scope-memos/v0.4.0-larger-models-eval-2026-05-04.md).

## Layout

```
tests/eval/
├── fixtures/
│   ├── 01-summarize-long/      # 20K-word doc → structured summary
│   ├── 02-summarize-long-chunked/  # 60K-token transcript → outline
│   ├── 03-classify/            # ambiguous text + 6-label taxonomy
│   ├── 04-extract/             # nested research metadata (flat schema)
│   └── 05-transform/           # meeting notes → action-items
│       ├── meta.json           # kind, style, instruction, etc.
│       ├── input.<ext>         # source text
│       ├── gold.<ext>          # reference answer (Opus-authored)
│       ├── categories.json     # classify only
│       └── schema.json         # extract only
├── lib/
│   ├── invoke.mjs              # in-process wrappers (mirrors server.ts prompts)
│   ├── ram.mjs                 # ps -p $$ -o rss= polling at 100ms
│   └── results.mjs             # flat JSONL store, lm-eval-harness style
├── runs/                       # gitignored — JSONL outputs
├── runner.mjs                  # iterate fixtures × trials, capture metrics
├── judge.mjs                   # Anthropic API scoring against gold
└── report.mjs                  # markdown matrix from one or more run files
```

## Workflow

```bash
# 0. build (runner imports compiled dist/)
npm run build

# 1. run a candidate model end-to-end
node tests/eval/runner.mjs --model ~/models/Qwen3-8B-Q4_K_M.gguf --ctx 8192

# 2. judge it
ANTHROPIC_API_KEY=sk-... node tests/eval/judge.mjs --run tests/eval/runs/<id>.jsonl

# 3. report (multi-file aggregate)
node tests/eval/report.mjs tests/eval/runs/*.jsonl > docs/notes/v0.4.0-eval-results-$(date +%Y%m%d).md
```

## Promotion criteria (Tier D)

A candidate is promoted **only** if:

- mean judge score ≥ **4.0/5.0** across all 5 fixtures
- max latency on tasks 01/03/04/05 < **60 s** (MCP wall-clock budget)
- peak RAM < **12 GB** (4 GB headroom on a 16 GB Mac)
- schema-constrained tasks (03 classify, 04 extract): structurally valid output
  on every trial (no parse errors)

`report.mjs` computes verdict automatically.

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

- **In-process invocation, not stdio MCP**: the eval measures *model on the
  same prompt as the bridge*, not the bridge wrapper. MCP framing is exercised
  by `tests/smoke-bridge.mjs` separately.
- **RAM measurement**: `process.memoryUsage().rss` undercounts Metal/GPU
  buffers on Apple Silicon. We poll `ps -p $$ -o rss=` at 100 ms — that
  reflects unified-memory residency including Metal.
- **Model swap**: the runner loads one model per invocation and disposes on
  exit. To eval multiple candidates, run `runner.mjs` separately for each —
  this avoids the "GC blind to native allocations → OOM" failure mode.
- **Judge variance**: temperature is taken from API defaults; for tighter
  agreement, run `--trials 3` on the runner and report median score per
  (model × task).
