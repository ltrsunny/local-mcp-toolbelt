#!/usr/bin/env node
/**
 * Report: aggregate one or more judged JSONL run files into a markdown table.
 * Designed to drop straight into `docs/notes/v0.4.0-eval-results-*.md`.
 *
 * Usage:
 *   node tests/eval/report.mjs runs/run-A.jsonl runs/run-B.jsonl
 *
 * Output: markdown table to stdout. Rows = task, cols = (model, mean score,
 * median latency, mean RAM, pass/fail vs scope memo Tier-D thresholds).
 *
 * Promotion thresholds (from scope memo):
 *   - quality avg ≥ 4.0/5.0
 *   - latency < 60s for tasks 01, 03, 04, 05 (chunked 02 has its own budget)
 *   - peak RAM < 12 GB (12288 MB)
 *   - schema-constrained tasks (03, 04): equality on at least 3 of N
 */

import { readRows } from './lib/results.mjs';

const QUALITY_THRESHOLD = 4.0;
const LATENCY_BUDGET_MS = 60_000;
const RAM_BUDGET_MB = 12_288;

function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function fmt(n, digits = 1) { return Number.isFinite(n) ? n.toFixed(digits) : 'n/a'; }

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: report.mjs <jsonl> [<jsonl>...]');
    process.exit(2);
  }
  const all = [];
  for (const f of files) {
    const rows = await readRows(f);
    all.push(...rows);
  }
  if (all.length === 0) { console.error('no rows'); process.exit(2); }

  // Group by (model_id × task)
  const byModelTask = new Map();
  for (const r of all) {
    const key = `${r.model_id}::${r.task}`;
    if (!byModelTask.has(key)) byModelTask.set(key, []);
    byModelTask.get(key).push(r);
  }

  // Per-model rollup for verdict
  const byModel = new Map();
  for (const r of all) {
    if (!byModel.has(r.model_id)) byModel.set(r.model_id, []);
    byModel.get(r.model_id).push(r);
  }

  // ── Per-(model, task) table ────────────────────────────────────────────────
  console.log('## Eval matrix (per model × task)\n');
  console.log('| model | task | n | score (mean) | latency p50 ms | peak RAM MB | tps p50 | errors |');
  console.log('|---|---|--:|--:|--:|--:|--:|--:|');
  const sortedKeys = [...byModelTask.keys()].sort();
  for (const k of sortedKeys) {
    const rs = byModelTask.get(k);
    const [model, task] = k.split('::');
    const ok = rs.filter((r) => !r.error);
    const scores = ok.map((r) => r.score).filter((s) => typeof s === 'number');
    const lats = ok.map((r) => r.metrics?.latency_ms ?? 0);
    const rams = ok.map((r) => r.metrics?.peak_ram_mb ?? 0);
    const tps = ok.map((r) => r.metrics?.tokens_per_sec ?? 0);
    const errs = rs.length - ok.length;
    console.log(`| \`${model}\` | ${task} | ${rs.length} | ${fmt(mean(scores))} | ${median(lats)} | ${Math.round(mean(rams))} | ${fmt(median(tps))} | ${errs} |`);
  }

  // ── Per-model verdict ──────────────────────────────────────────────────────
  console.log('\n## Tier-D promotion verdict\n');
  console.log('| model | mean score | meets quality? | meets latency? | meets RAM? | verdict |');
  console.log('|---|--:|:-:|:-:|:-:|:-:|');
  for (const [model, rs] of byModel) {
    const ok = rs.filter((r) => !r.error);
    const scores = ok.map((r) => r.score).filter((s) => typeof s === 'number');
    const meanScore = mean(scores);
    // Latency budget applies to tasks 01, 03, 04, 05 (skip 02 chunked)
    const latencyTasks = ok.filter((r) => /^(01|03|04|05)/.test(r.task));
    const maxLatency = Math.max(0, ...latencyTasks.map((r) => r.metrics?.latency_ms ?? 0));
    const maxRam = Math.max(0, ...ok.map((r) => r.metrics?.peak_ram_mb ?? 0));
    const qOk = meanScore >= QUALITY_THRESHOLD;
    const lOk = maxLatency < LATENCY_BUDGET_MS;
    const rOk = maxRam < RAM_BUDGET_MB;
    const verdict = qOk && lOk && rOk ? '**promote**' : 'reject';
    console.log(`| \`${model}\` | ${fmt(meanScore, 2)} | ${qOk ? '✅' : '❌'} | ${lOk ? '✅' : '❌'} (${maxLatency}ms) | ${rOk ? '✅' : '❌'} (${maxRam}MB) | ${verdict} |`);
  }

  // ── Errors detail ─────────────────────────────────────────────────────────
  const errored = all.filter((r) => r.error);
  if (errored.length > 0) {
    console.log('\n## Errors\n');
    for (const r of errored) {
      console.log(`- \`${r.model_id}\` / ${r.task} trial=${r.trial}: ${r.error}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
