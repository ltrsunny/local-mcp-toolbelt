#!/usr/bin/env node
/**
 * Cross-client smoke test — exercises the bridge over real STDIO transport
 * (the same channel Claude Desktop / Cursor / Cline use), not the
 * InMemoryTransport that powers the unit suite.
 *
 * v0.6.0 release-gate smoke. Verifies:
 *   1. Bridge spawns and answers `initialize` without crashing.
 *   2. `tools/list` returns the expected 11 tools (6 sync + async triad
 *      v0.6.0 + legacy enqueue-job + wait_for_job + read_job_result +
 *      check_progress).
 *   3. `check_progress` with an unknown `job_id` returns `isError: true`
 *      (the documented contract).
 *
 * Exits 0 on full success; 1 on any failure. Not part of `npm test` —
 * separate smoke that requires the build dist to exist and is run
 * before tagging a release.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_JS = path.resolve(__dirname, '..', 'dist', 'bin', 'cli.js');

// v0.6.0 tool inventory we expect tools/list to return. Order doesn't
// matter; set membership does. Keep in sync with server.ts registerTool
// calls.
const EXPECTED_TOOLS = new Set([
  // 6 sync tools
  'summarize',
  'summarize-long',
  'summarize-long-chunked',
  'classify',
  'extract',
  'transform',
  'diff-semantic-index',
  // v0.3.0 legacy async triad
  'enqueue-job',
  'wait_for_job',
  'read_job_result',
  // v0.6.0 async triad
  'enqueue_job',
  'check_progress',
]);

function red(s) {
  return `\x1b[31m${s}\x1b[0m`;
}
function green(s) {
  return `\x1b[32m${s}\x1b[0m`;
}

async function main() {
  console.log(`[smoke] spawning bridge: node ${CLI_JS} serve`);

  // StdioClientTransport handles spawn + stdio piping internally.
  const transport = new StdioClientTransport({
    command: 'node',
    args: [CLI_JS, 'serve'],
  });
  const client = new Client({ name: 'cross-client-smoke', version: '0.0.0' });

  let failures = 0;
  try {
    await client.connect(transport);
    console.log(`${green('✓')} initialize succeeded`);

    // tools/list
    const list = await client.listTools();
    const names = new Set(list.tools.map((t) => t.name));
    const missing = [...EXPECTED_TOOLS].filter((n) => !names.has(n));
    const extra = [...names].filter((n) => !EXPECTED_TOOLS.has(n));
    if (missing.length === 0 && extra.length === 0) {
      console.log(`${green('✓')} tools/list — all ${EXPECTED_TOOLS.size} expected tools present`);
    } else {
      failures++;
      if (missing.length > 0) console.log(`${red('✗')} tools/list missing: ${missing.join(', ')}`);
      if (extra.length > 0) console.log(`${red('✗')} tools/list unexpected: ${extra.join(', ')}`);
    }

    // check_progress with unknown job_id — verifies the tool wires up
    // and returns the documented isError shape.
    const res = await client.callTool({
      name: 'check_progress',
      arguments: { job_id: 'smoke-test-nonexistent-job-id' },
    });
    if (res.isError === true) {
      console.log(`${green('✓')} check_progress unknown job_id → isError=true`);
    } else {
      failures++;
      console.log(`${red('✗')} check_progress unknown job_id should isError=true, got: ${JSON.stringify(res).slice(0, 200)}`);
    }
  } catch (err) {
    failures++;
    console.log(`${red('✗')} smoke harness threw: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
  }

  if (failures === 0) {
    console.log(green('\n[smoke] PASS — bridge stdio transport healthy for v0.6.0 release'));
    process.exit(0);
  } else {
    console.log(red(`\n[smoke] FAIL — ${failures} check(s) failed`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[smoke] uncaught: ${err.message}`);
  process.exit(1);
});
