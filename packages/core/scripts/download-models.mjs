#!/usr/bin/env node
/**
 * download-models — fetch the MLX-format weights that DEFAULT_CONFIG references
 * into `~/.omlx/models/`, the directory oMLX serves from.
 *
 * Usage:
 *   npm run download-models               # all tiers (B+C share Qwen3-8B; D = 14B)
 *   npm run download-models -- --tiers B,C
 *
 * Requires: oMLX installed (`brew install jundot/omlx/omlx`) — uses oMLX's
 * bundled Python + huggingface_hub. We do NOT add huggingface_hub as an npm
 * dep because the typical install already has it via the oMLX Homebrew formula.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const OMLX_PYTHON = '/opt/homebrew/opt/omlx/libexec/bin/python';
const MODELS_DIR = path.join(homedir(), '.omlx', 'models');

/** (tier label) → (HF repo, local dir name) */
const MODELS = {
  B: { repo: 'mlx-community/Qwen3-8B-4bit', dir: 'Qwen3-8B-4bit' }, // shared with C
  C: { repo: 'mlx-community/Qwen3-8B-4bit', dir: 'Qwen3-8B-4bit' },
  D: { repo: 'mlx-community/Qwen3-14B-4bit', dir: 'Qwen3-14B-4bit' },
};

function parseArgs(argv) {
  const out = { tiers: ['B', 'C', 'D'] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--tiers') {
      out.tiers = argv[++i].split(',').map((s) => s.trim().toUpperCase());
    }
  }
  return out;
}

function downloadOne(repo, dirName) {
  const target = path.join(MODELS_DIR, dirName);
  if (existsSync(target)) {
    console.log(`✓ ${dirName} already present at ${target}`);
    return Promise.resolve();
  }
  console.log(`↓ ${repo} → ${target}`);
  return new Promise((resolve, reject) => {
    const py = spawn(
      OMLX_PYTHON,
      [
        '-c',
        `from huggingface_hub import snapshot_download
snapshot_download(repo_id=${JSON.stringify(repo)},
  local_dir=${JSON.stringify(target)},
  ignore_patterns=['*.pt', '*.bin'])`,
      ],
      { stdio: 'inherit' },
    );
    py.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`download exited ${code}`)),
    );
  });
}

async function main() {
  const { tiers } = parseArgs(process.argv);
  if (!existsSync(OMLX_PYTHON)) {
    console.error(
      `oMLX Python not found at ${OMLX_PYTHON}. Install oMLX first:\n` +
        `  brew install jundot/omlx/omlx`,
    );
    process.exit(2);
  }
  // De-dup: B and C share Qwen3-8B-4bit; download once.
  const seen = new Set();
  for (const t of tiers) {
    const m = MODELS[t];
    if (!m) {
      console.error(`Unknown tier: ${t}`);
      process.exit(2);
    }
    if (seen.has(m.repo)) continue;
    seen.add(m.repo);
    await downloadOne(m.repo, m.dir);
  }
  console.log('\nDone. Start oMLX:  brew services start jundot/omlx/omlx');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
