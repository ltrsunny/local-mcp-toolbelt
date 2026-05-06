#!/usr/bin/env node
/**
 * Eval runner: load a GGUF model via LlamaCppBackend, iterate fixtures,
 * record candidate output + latency + RAM peak into a JSONL run file.
 *
 * Usage:
 *   node tests/eval/runner.mjs \
 *     --model ~/models/Qwen3-8B-Q4_K_M.gguf \
 *     [--ctx 8192] \
 *     [--tasks 01,03,05]   (default: all)
 *     [--trials 1]
 *
 * Output:
 *   tests/eval/runs/<run-id>.jsonl     (one row per trial)
 *
 * Run id format: YYYYMMDD-HHMMSS-<model-stem>. Stable enough to
 * cross-reference, unique enough not to collide on rapid re-runs.
 *
 * To swap to a second model after the first run completes, dispose() is
 * always called in finally — see node-llama-cpp v3 dispose pattern (gem
 * research 2026-05-05).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { LlamaCppBackend } from '../../dist/src/llm/llama-cpp-backend.js';
import {
  invokeSummarizeLong, invokeClassify, invokeExtract, invokeTransform,
} from './lib/invoke.mjs';
import { withRssPeak } from './lib/ram.mjs';
import { appendRow, makeRow } from './lib/results.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(SCRIPT_DIR, 'fixtures');
const RUNS_DIR = path.join(SCRIPT_DIR, 'runs');

// ── CLI parse ───────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { tasks: 'all', trials: 1, ctx: 8192 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--model') out.model = argv[++i];
    else if (a === '--ctx') out.ctx = parseInt(argv[++i], 10);
    else if (a === '--tasks') out.tasks = argv[++i];
    else if (a === '--trials') out.trials = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log(`runner.mjs --model <gguf-path> [--ctx 8192] [--tasks all|01,03] [--trials 1]`);
      process.exit(0);
    }
  }
  if (!out.model) {
    console.error('--model <path-to-.gguf> is required');
    process.exit(2);
  }
  // ~ expansion
  if (out.model.startsWith('~/')) out.model = path.join(process.env.HOME, out.model.slice(2));
  if (!existsSync(out.model)) {
    console.error(`Model not found: ${out.model}`);
    process.exit(2);
  }
  return out;
}

// ── Fixture loading ─────────────────────────────────────────────────────────

async function loadFixture(taskDir) {
  const metaPath = path.join(taskDir, 'meta.json');
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  const inputPath = path.join(taskDir, meta.input_file ?? 'input.txt');
  const goldPath = path.join(taskDir, meta.gold_file ?? 'gold.txt');
  const input = await readFile(inputPath, 'utf8');
  const gold = await readFile(goldPath, 'utf8');
  let categories, schema;
  if (meta.categories_file) {
    categories = JSON.parse(await readFile(path.join(taskDir, meta.categories_file), 'utf8'));
  }
  if (meta.schema_file) {
    schema = JSON.parse(await readFile(path.join(taskDir, meta.schema_file), 'utf8'));
  }
  return { meta, input, gold, categories, schema };
}

async function selectTaskDirs(tasksArg) {
  const { readdir } = await import('node:fs/promises');
  const all = (await readdir(FIXTURES_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (tasksArg === 'all') return all;
  const wanted = tasksArg.split(',').map((s) => s.trim());
  return all.filter((dir) => wanted.some((w) => dir.startsWith(w)));
}

// ── Per-task execution ──────────────────────────────────────────────────────

async function runOneTrial({
  backend, runId, taskId, fixture, modelPath, ctx, trial,
}) {
  const row = makeRow({
    runId, task: taskId, modelId: backend.modelId, modelPath, contextSize: ctx,
    instanceId: fixture.meta.instance_id ?? 'default', trial,
  });
  row.reference = fixture.gold;

  const t0 = performance.now();
  let out;
  try {
    const measured = await withRssPeak(async () => {
      const taskKind = fixture.meta.kind; // 'summarize-long' | 'classify' | 'extract' | 'transform'
      const sharedOpts = { maxInputTokens: ctx };
      if (taskKind === 'summarize-long') {
        const text = fixture.input;
        row.prompt_user = `(summarize-long) input length=${text.length}`;
        return invokeSummarizeLong(backend, { text, style: fixture.meta.style, ...sharedOpts });
      }
      if (taskKind === 'classify') {
        row.prompt_user = `(classify) labels=${fixture.categories.length}`;
        return invokeClassify(backend, {
          text: fixture.input,
          categories: fixture.categories,
          allowMultiple: !!fixture.meta.allow_multiple,
          explain: !!fixture.meta.explain,
          ...sharedOpts,
        });
      }
      if (taskKind === 'extract') {
        row.prompt_user = `(extract) schema fields=${Object.keys(fixture.schema.properties ?? {}).length}`;
        return invokeExtract(backend, { text: fixture.input, schema: fixture.schema, ...sharedOpts });
      }
      if (taskKind === 'transform') {
        row.prompt_user = `(transform) instruction=${(fixture.meta.instruction ?? '').slice(0, 80)}`;
        return invokeTransform(backend, {
          text: fixture.input,
          instruction: fixture.meta.instruction,
          ...sharedOpts,
        });
      }
      throw new Error(`Unknown task kind: ${taskKind}`);
    });
    out = measured;
  } catch (err) {
    row.error = err?.message ?? String(err);
    return row;
  }

  const latencyMs = Math.round(performance.now() - t0);
  const r = out.result;
  row.candidate = r.text;
  row.metrics.latency_ms = latencyMs;
  row.metrics.peak_ram_mb = out.peakRssMb;
  row.metrics.delta_ram_mb = out.deltaRssMb;
  row.metrics.prompt_tokens = r.promptTokens;
  row.metrics.completion_tokens = r.completionTokens;
  row.metrics.tokens_per_sec = latencyMs > 0
    ? Math.round((r.completionTokens / (latencyMs / 1000)) * 10) / 10
    : 0;
  return row;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  await mkdir(RUNS_DIR, { recursive: true });

  const stem = path.basename(args.model).replace(/\.gguf$/i, '');
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const runId = `${ts}-${stem}`;
  const runFile = path.join(RUNS_DIR, `${runId}.jsonl`);

  console.log(`[runner] run_id=${runId}`);
  console.log(`[runner] model=${args.model} ctx=${args.ctx}`);
  console.log(`[runner] output=${runFile}`);

  const taskDirs = await selectTaskDirs(args.tasks);
  if (taskDirs.length === 0) {
    console.error(`No fixtures matched tasks=${args.tasks}`);
    process.exit(2);
  }

  const backend = new LlamaCppBackend({ modelPath: args.model, contextSize: args.ctx });
  try {
    await backend.ping();
    console.log(`[runner] backend ready: ${backend.modelId}`);
    for (const dir of taskDirs) {
      const taskDir = path.join(FIXTURES_DIR, dir);
      let fixture;
      try {
        fixture = await loadFixture(taskDir);
      } catch (e) {
        console.error(`[runner] skipping ${dir}: ${e.message}`);
        continue;
      }
      for (let trial = 0; trial < args.trials; trial++) {
        const label = `[runner] ${dir} trial=${trial}`;
        console.log(`${label} → start`);
        const row = await runOneTrial({
          backend, runId, taskId: dir, fixture, modelPath: args.model, ctx: args.ctx, trial,
        });
        await appendRow(runFile, row);
        if (row.error) {
          console.log(`${label} ✗ error: ${row.error}`);
        } else {
          console.log(`${label} ✓ ${row.metrics.latency_ms}ms peakRAM=${row.metrics.peak_ram_mb}MB tps=${row.metrics.tokens_per_sec}`);
        }
      }
    }
  } finally {
    await backend.dispose();
    console.log(`[runner] backend disposed`);
  }

  console.log(`[runner] done. ${runFile}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
