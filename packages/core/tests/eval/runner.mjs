#!/usr/bin/env node
/**
 * Eval runner: run the 5 benchmark fixtures against a local LLM backend and
 * record candidate output + latency + RAM peak into a JSONL run file.
 *
 * Supports two backends:
 *   --model  <gguf-path>  → LlamaCppBackend (in-process node-llama-cpp)
 *   --mlx-url <base-url>  → MlxHttpBackend  (MLX FastAPI bridge, v0.5.0+)
 *
 * Usage (GGUF / llama.cpp):
 *   node tests/eval/runner.mjs \
 *     --model ~/models/Mistral-Nemo-Instruct-2407-Q4_K_M.gguf \
 *     [--ctx 16384] [--tasks all] [--trials 5]
 *
 * Usage (MLX HTTP bridge):
 *   python mlx-bridge-server.py --model mlx-community/Qwen3-14B-4bit &
 *   node tests/eval/runner.mjs \
 *     --mlx-url http://127.0.0.1:8080 \
 *     [--ctx 16384] [--tasks all] [--trials 5]
 *
 * Output:
 *   tests/eval/runs/<run-id>.jsonl   (one JSONL row per trial)
 *
 * Latency measured end-to-end from JS (includes HTTP overhead for MLX path).
 * RAM sampling via macOS ps (LlamaCppBackend: in-process; MlxHttpBackend:
 * measures the Node bridge process — server-side RAM must be checked
 * separately via `ps aux | grep mlx-bridge-server`).
 */

import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { LlamaCppBackend } from '../../dist/src/llm/llama-cpp-backend.js';
import { MlxHttpBackend } from '../../dist/src/llm/mlx-http-backend.js';
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
  const out = { tasks: 'all', trials: 1, ctx: 16384 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--model') out.model = argv[++i];
    else if (a === '--mlx-url') out.mlxUrl = argv[++i];
    else if (a === '--ctx') out.ctx = parseInt(argv[++i], 10);
    else if (a === '--tasks') out.tasks = argv[++i];
    else if (a === '--trials') out.trials = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log(
        'runner.mjs (--model <gguf-path> | --mlx-url <url>) ' +
        '[--ctx 16384] [--tasks all|01,03] [--trials 5]',
      );
      process.exit(0);
    }
  }
  if (!out.model && !out.mlxUrl) {
    console.error('One of --model <gguf-path> or --mlx-url <url> is required');
    process.exit(2);
  }
  if (out.model && out.mlxUrl) {
    console.error('--model and --mlx-url are mutually exclusive');
    process.exit(2);
  }
  // ~ expansion for GGUF path
  if (out.model) {
    if (out.model.startsWith('~/')) out.model = path.join(process.env.HOME, out.model.slice(2));
    if (!existsSync(out.model)) {
      console.error(`Model not found: ${out.model}`);
      process.exit(2);
    }
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

  // Run ID: use model filename (GGUF) or URL host:port (MLX)
  const stem = args.mlxUrl
    ? 'mlx-' + new URL(args.mlxUrl).port
    : path.basename(args.model).replace(/\.gguf$/i, '');
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

  // ── Create backend ────────────────────────────────────────────────────────
  let backend;
  if (args.mlxUrl) {
    backend = new MlxHttpBackend({ baseUrl: args.mlxUrl, numCtx: args.ctx });
    console.log(`[runner] backend=MLX url=${args.mlxUrl} ctx=${args.ctx}`);
  } else {
    backend = new LlamaCppBackend({ modelPath: args.model, contextSize: args.ctx });
    console.log(`[runner] backend=llama.cpp model=${args.model} ctx=${args.ctx}`);
  }

  const modelRef = args.mlxUrl ?? args.model;

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
          backend, runId, taskId: dir, fixture, modelPath: modelRef, ctx: args.ctx, trial,
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
    // LlamaCppBackend requires explicit dispose (frees native Metal resources).
    // MlxHttpBackend is stateless (HTTP-only) — no dispose needed.
    if (typeof backend.dispose === 'function') {
      await backend.dispose();
      console.log(`[runner] backend disposed`);
    }
  }

  console.log(`[runner] done. ${runFile}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
