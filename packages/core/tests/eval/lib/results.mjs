/**
 * Flat JSONL run store, schema modeled on EleutherAI lm-evaluation-harness:
 * one line per (run × model × task × instance × trial). One file holds
 * candidate outputs; the same file is later updated in place by `judge.mjs`
 * with `judge_reasoning` + `score` fields appended.
 *
 * Flat-schema rationale: trivially loadable into Pandas / DuckDB / SQLite for
 * post-hoc filtering ("show all trials where score < 3 and model contains '8B'").
 */

import { createReadStream } from 'node:fs';
import { appendFile, writeFile, readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

/**
 * @typedef {Object} ResultRow
 * @property {string} run_id          - identifies a single matrix run (timestamp-based)
 * @property {string} task            - fixture id, e.g. "03-classify"
 * @property {string} model_id        - backend.modelId (e.g. "llama-cpp:Qwen3-8B-Q4_K_M.gguf")
 * @property {string} model_path      - absolute path used to load
 * @property {number} context_size    - context window in tokens
 * @property {string} instance_id     - fixture instance id (most fixtures = "default")
 * @property {number} trial           - 0-indexed retry within (model × task × instance)
 * @property {string} prompt_user     - full user prompt sent to backend
 * @property {string} reference       - gold output text (literal contents of gold.<ext>)
 * @property {string} candidate       - actual model output
 * @property {Object} metrics
 * @property {number} metrics.latency_ms
 * @property {number} metrics.peak_ram_mb
 * @property {number} metrics.delta_ram_mb
 * @property {number} metrics.prompt_tokens
 * @property {number} metrics.completion_tokens
 * @property {number} metrics.tokens_per_sec
 * @property {string|null} error      - error message if the trial failed; candidate stays empty
 * @property {string|null} judge_model    - filled in by judge.mjs
 * @property {string|null} judge_reasoning
 * @property {number|null} score      - 1..5 from judge.mjs
 * @property {string} ts              - ISO timestamp
 */

export async function appendRow(jsonlPath, row) {
  await appendFile(jsonlPath, JSON.stringify(row) + '\n', 'utf8');
}

/** Stream-read JSONL into an array of rows. */
export async function readRows(jsonlPath) {
  const rows = [];
  const stream = createReadStream(jsonlPath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    rows.push(JSON.parse(t));
  }
  return rows;
}

/**
 * Rewrite the file with `rows`. Used by judge.mjs to add scores to rows
 * already on disk. Atomic via tmp + rename to avoid partial writes if the
 * judge crashes mid-update.
 */
export async function rewriteRows(jsonlPath, rows) {
  const tmp = jsonlPath + '.tmp';
  const body = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  await writeFile(tmp, body, 'utf8');
  // fs.rename is atomic on the same filesystem on macOS APFS.
  const { rename } = await import('node:fs/promises');
  await rename(tmp, jsonlPath);
}

/** Build an empty row with required keys for downstream accumulation. */
export function makeRow({
  runId, task, modelId, modelPath, contextSize, instanceId = 'default', trial = 0,
}) {
  return {
    run_id: runId,
    task,
    model_id: modelId,
    model_path: modelPath,
    context_size: contextSize,
    instance_id: instanceId,
    trial,
    prompt_user: '',
    reference: '',
    candidate: '',
    metrics: {
      latency_ms: 0,
      peak_ram_mb: 0,
      delta_ram_mb: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      tokens_per_sec: 0,
    },
    error: null,
    judge_model: null,
    judge_reasoning: null,
    score: null,
    ts: new Date().toISOString(),
  };
}
