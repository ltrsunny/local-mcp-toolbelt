#!/usr/bin/env node
/**
 * Judge: read a runner output file, score each candidate against its gold
 * via Nvidia NIM (OpenAI-compatible endpoint), write `judge_reasoning` and
 * `score` (1-5) back into the same JSONL file in place.
 *
 * Prompt template based on MT-Bench single-answer grading: CoT first, then
 * "Score: <n>" on its own line. Reasoning-before-score reduces score-anchor
 * bias (research note: scope-memo gem 2026-05-05).
 *
 * Usage:
 *   source ~/.config/llm-orchestration/secrets.env
 *   node tests/eval/judge.mjs --run runs/<id>.jsonl
 *
 * Idempotent: rows already containing a numeric `score` are skipped unless
 * --force is passed. Re-runs only fill missing scores.
 *
 * Override judge model: NV_JUDGE_MODEL=mistralai/mistral-large-3-675b-instruct-2512
 */

import { readRows, rewriteRows } from './lib/results.mjs';

const NIM_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_JUDGE_MODEL = 'qwen/qwen3-coder-480b-a35b-instruct';
const JUDGE_MODEL = process.env.NV_JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL;
const JUDGE_MAX_TOKENS = 800;

const TEMPLATE = `[Instruction]
Please act as an impartial judge and evaluate the quality of an AI assistant's answer to the task displayed below. Compare it against the reference answer. Your evaluation should consider correctness, completeness, faithfulness to the source (no hallucinations), and adherence to the task's stated style requirements.

Begin your evaluation by comparing the assistant's answer with the reference answer. Identify and explain any specific mistakes or missing content. Be objective. Length is not quality — a short faithful answer beats a long padded one.

After your explanation, on a NEW LINE, output the score in EXACTLY this format with no surrounding text:
Score: <integer 1-5>

Scoring rubric:
5 — Matches the reference's key claims and style; no factual errors; nothing important missing.
4 — Captures most key claims; minor wording or omission issues; no factual errors.
3 — Captures the gist but misses one important claim OR has minor inaccuracies.
2 — Significant omissions or one clear factual error.
1 — Mostly unrelated, hallucinated, or task-violating output.

[Task]
{task}

[The Start of Reference Answer]
{reference}
[The End of Reference Answer]

[The Start of Assistant's Answer]
{candidate}
[The End of Assistant's Answer]
`;

function parseArgs(argv) {
  const out = { force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') out.run = argv[++i];
    else if (a === '--force') out.force = true;
    else if (a === '--help' || a === '-h') {
      console.log('judge.mjs --run <path-to-jsonl> [--force]');
      process.exit(0);
    }
  }
  if (!out.run) { console.error('--run <path> is required'); process.exit(2); }
  return out;
}

function buildJudgePrompt({ task, reference, candidate }) {
  return TEMPLATE
    .replace('{task}', task)
    .replace('{reference}', reference)
    .replace('{candidate}', candidate);
}

function parseScore(text) {
  const matches = [...text.matchAll(/^\s*Score:\s*([1-5])\s*$/gm)];
  if (matches.length === 0) return null;
  const n = parseInt(matches[matches.length - 1][1], 10);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

async function callJudge({ apiKey, model, prompt }) {
  const res = await fetch(NIM_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: JUDGE_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NIM API ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function main() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('NVIDIA_API_KEY env var is required');
    console.error('Run: source ~/.config/llm-orchestration/secrets.env');
    process.exit(2);
  }
  const args = parseArgs(process.argv);
  const rows = await readRows(args.run);
  console.log(`[judge] ${rows.length} rows loaded from ${args.run}`);
  console.log(`[judge] model: ${JUDGE_MODEL}`);

  let scored = 0, skipped = 0, failed = 0;
  for (const row of rows) {
    if (row.error) { skipped++; continue; }
    if (typeof row.score === 'number' && !args.force) { skipped++; continue; }
    const taskDesc = `${row.task} — see fixture meta.json for the full task spec.`;
    const prompt = buildJudgePrompt({
      task: taskDesc,
      reference: row.reference ?? '',
      candidate: row.candidate ?? '',
    });
    try {
      const judgeText = await callJudge({ apiKey, model: JUDGE_MODEL, prompt });
      row.judge_model = JUDGE_MODEL;
      row.judge_reasoning = judgeText;
      row.score = parseScore(judgeText);
      if (row.score === null) {
        console.warn(`[judge] ${row.task} trial=${row.trial}: failed to parse score`);
        failed++;
      } else {
        scored++;
        console.log(`[judge] ${row.task} trial=${row.trial} → ${row.score}/5`);
      }
    } catch (e) {
      row.judge_reasoning = `JUDGE_ERROR: ${e.message}`;
      row.score = null;
      failed++;
      console.error(`[judge] ${row.task} trial=${row.trial} error: ${e.message}`);
    }
  }
  await rewriteRows(args.run, rows);
  console.log(`[judge] done. scored=${scored} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
