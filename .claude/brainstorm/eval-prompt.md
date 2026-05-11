You are running an automated v0.5.0 oMLX eval for local-mcp-toolbelt.

PROJECT: /Users/rd/ollama-claude
ORACLE: oMLX server at localhost:8000 (running, hot_cache=10GB)
EVAL HARNESS: packages/core/tests/eval/
WORKFLOW DOC: packages/core/tests/eval/README.md
TIME BUDGET: 45 min wall

INSTRUCTIONS (use --yolo permissions you have, do not ask back):

```bash
cd /Users/rd/ollama-claude/packages/core
npm run build

# Verify oMLX
curl -s localhost:8000/v1/models | jq -r '.data[].id'

# Tier B run (4B-Instruct, default — short tasks)
node tests/eval/runner.mjs \
  --mlx-url http://127.0.0.1:8000 \
  --mlx-model Qwen3-4B-Instruct-2507-4bit \
  --ctx 8192 \
  --tasks all --trials 3

# Tier C run (8B at 32K ctx — long-form)
node tests/eval/runner.mjs \
  --mlx-url http://127.0.0.1:8000 \
  --mlx-model Qwen3-8B-4bit \
  --ctx 32768 \
  --tasks 01,02 --trials 3

# Tier D run (14B for classify + transform ONLY)
node tests/eval/runner.mjs \
  --mlx-url http://127.0.0.1:8000 \
  --mlx-model Qwen3-14B-4bit \
  --ctx 16384 \
  --tasks 03,05 --trials 3

# Judge each run
source /Users/rd/.config/claude-dev/secrets.env
for f in tests/eval/runs/*.jsonl; do
  echo "Judging $f..."
  node tests/eval/judge.mjs --run "$f" || echo "Judge failed on $f"
done

# Final report
node tests/eval/report.mjs tests/eval/runs/*.jsonl \
  > /Users/rd/ollama-claude/docs/notes/v0.5.1-eval-2026-05-11.md

cat /Users/rd/ollama-claude/docs/notes/v0.5.1-eval-2026-05-11.md
```

VALIDATION CRITERIA (per packages/core/tests/eval/README.md "Tier validation criteria"):
- mean judge score ≥ 4.0/5.0 across 5 fixtures
- 95p latency on tasks 01/03/04/05 < 55s
- peak RAM < 12GB
- schema-constrained tasks structurally valid every trial

OUTPUT YOU MUST RETURN:
1. What tiers passed validation
2. Any task that hit 60s wall
3. RAM peak observed
4. Schema failures (if any)
5. Path to the generated report markdown
6. Total runtime

ON ERROR: Debug yourself. If something hangs >5 min on a single trial, kill that
trial and report `timeout on <task>` but continue. If `npm run build` fails,
inspect the error and try to fix. Don't ask back.
