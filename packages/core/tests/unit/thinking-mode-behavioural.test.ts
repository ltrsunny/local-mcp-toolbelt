/**
 * Behavioural unit test for v0.6.0 per-tool thinking-mode default
 * propagation — the boundary contract.
 *
 * When a sync MCP tool is invoked, the server should resolve the
 * per-tool default through `resolveThinking()` and pass the resulting
 * `disableThinking` boolean into `backend.chat()`. This test asserts
 * that contract for every entry in `THINKING_DEFAULTS`, plus the
 * per-call override cases (`thinking='on'|'off'|'auto'`).
 *
 * This is deliberately the "wiring" layer — it does NOT test the
 * downstream model behavior (whether the model actually emits
 * `<think>` tokens). The latter requires a real oMLX server and is
 * covered by dogfood (G in scope memo v0.7.0-bridge-enforcement-2026-05-15.md).
 *
 * Background: a 4-round adversarial fan-out for v0.6.0's release gate
 * concluded that F (programmatic scorer) is a category error against
 * v0.6.0's plumbing-only changes — the model didn't change in v0.6.0,
 * only the thinking-mode wiring did. H (this file) plus G (dogfood)
 * is the chosen release gate. See `.claude/brainstorm/fh-deeper-audit-*`
 * for the audit artifacts.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildBridgeServer } from '../../src/mcp/server.js';
import {
  _installTestBackend,
  _resetMlxHttpCacheForTests,
} from '../../src/mcp/backend-factory.js';
import { JobStore } from '../../src/jobs/store.js';
import { JobRegistry } from '../../src/jobs/registry.js';
import { JobRunner } from '../../src/jobs/runner.js';
import { RecorderBackend } from './recorder-client.js';
import { THINKING_DEFAULTS } from '../../src/config/thinking-defaults.js';

/**
 * Long input that exceeds the Tier C fast-path budget (~32 K tokens),
 * forcing `summarize-long-chunked` through both MAP and REDUCE phases.
 * Without this, a 2-word input takes the fast-path single-chat-call
 * branch and never exercises the reduce-stage wiring — exactly the
 * gap gem flagged in the diff-review fan-out (Round 5, 2026-05-15).
 *
 * RecorderBackend.countTokens is `text.length / 3.5`, so ~140 KB
 * yields ~40 K tokens (well above the ~32 K fast-path budget) and
 * produces ~25 chunks at the default 2000-token chunk size — plenty
 * to trigger the recursive reduce path.
 */
const LONG_TEXT_FOR_CHUNKING = 'a long sentence to force chunking. '.repeat(4000);

/**
 * Minimal valid input per sync tool — just enough for the input
 * schema to accept and for the handler to reach `backend.chat()`. The
 * recorder returns a fixed response so prompt content / output
 * shape is not asserted.
 *
 * v0.6.0 Round 5 addressed two coverage gaps gem caught in diff review:
 *   - `summarize-long-chunked` input was 2 words; only exercised the
 *     fast-path single-call branch. Now LONG_TEXT_FOR_CHUNKING forces
 *     MAP + REDUCE so the test asserts disableThinking propagates to
 *     both phases.
 *   - `diff-semantic-index` was skipped on the (insufficient) ground
 *     that "wiring is identical at server.ts:1010". The wiring test's
 *     core value IS catching a handler that drops the disableThinking
 *     key from chat() call options. Now exercised with a minimal git
 *     diff input — the size is well below the 28 KB Tier B budget.
 */
const MINIMAL_INPUTS: Record<string, Record<string, unknown>> = {
  summarize: { text: 'hello world' },
  'summarize-long': { text: 'hello world' },
  'summarize-long-chunked': { text: LONG_TEXT_FOR_CHUNKING },
  classify: { text: 'hello', categories: ['a', 'b'] },
  extract: {
    text: 'name: alice',
    schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  transform: { text: 'hello', instruction: 'uppercase it' },
  'diff-semantic-index': {
    diff_text:
      'diff --git a/a b/b\n' +
      '--- a/a\n' +
      '+++ b/b\n' +
      '@@ -1 +1 @@\n' +
      '-a\n' +
      '+b\n',
  },
};

/** Env vars cleared per test so leaks across cases can't fake-pass. */
const ENV_KEYS = [
  'OMCP_THINKING_MODE',
  'OMCP_THINKING_SUMMARIZE',
  'OMCP_THINKING_SUMMARIZE_LONG',
  'OMCP_THINKING_SUMMARIZE_LONG_CHUNKED',
  'OMCP_THINKING_CLASSIFY',
  'OMCP_THINKING_EXTRACT',
  'OMCP_THINKING_TRANSFORM',
  'OMCP_THINKING_DIFF_SEMANTIC_INDEX',
];

let tmpDir: string;
let recorder: RecorderBackend;
let client: Client;
let store: JobStore;
let registry: JobRegistry;
let runner: JobRunner;
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }

  tmpDir = await mkdtemp(join(tmpdir(), 'omcp-thinking-behavioural-'));
  store = new JobStore({ baseDir: tmpDir });
  registry = new JobRegistry(store);
  await registry.initialize();

  // toolInvoker only matters when async tools (enqueue_job etc.) are
  // exercised; this test only hits sync tools. A no-op stub keeps the
  // server build happy.
  runner = new JobRunner(
    registry,
    async () => ({
      isError: true,
      content: [{ type: 'text' as const, text: 'sync-only test stub' }],
    }),
    { concurrency: 1 },
  );

  _resetMlxHttpCacheForTests();
  recorder = new RecorderBackend();
  _installTestBackend(recorder);

  const server = buildBridgeServer({
    defendUntrusted: false,
    jobRegistry: registry,
    jobRunner: runner,
  });
  const [serverT, clientT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  client = new Client({ name: 'thinking-behav-test', version: '0.0.0' });
  await client.connect(clientT);
});

afterEach(async () => {
  await client.close();
  await runner.waitIdle();
  await rm(tmpDir, { recursive: true, force: true });
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('thinking-mode propagation — registry defaults', () => {
  for (const tool of Object.keys(MINIMAL_INPUTS)) {
    const expectedMode = THINKING_DEFAULTS[tool];
    const expectedDisable = expectedMode === 'off';

    it(`${tool} with no thinking arg → chat() receives disableThinking=${expectedDisable}`, async () => {
      await client.callTool({
        name: tool,
        arguments: MINIMAL_INPUTS[tool],
      });

      expect(
        recorder.recorded.length,
        `expected at least one backend.chat() call after invoking ${tool}`,
      ).toBeGreaterThan(0);

      // summarize-long-chunked must produce MULTIPLE calls (MAP per
      // chunk + REDUCE). If the input ever silently fits the fast-path
      // budget again — e.g. a regression that raises maxInputTokens —
      // this assertion fails loudly instead of vacuously passing a
      // 1-element forEach. The exact count depends on chunk size
      // (default 2000 tokens) and TOKENIZER_SAFETY_FACTOR (0.85), but
      // > 1 is a stable lower bound at LONG_TEXT_FOR_CHUNKING's size.
      if (tool === 'summarize-long-chunked') {
        expect(
          recorder.recorded.length,
          'summarize-long-chunked must exercise MAP + REDUCE (multi-call)',
        ).toBeGreaterThan(1);
      }

      // Every chat call from this tool invocation must carry the same
      // flag — chunked summarize issues N calls during MAP plus 1+
      // during REDUCE; all must propagate the same resolved value.
      for (const call of recorder.recorded) {
        expect(
          call.args.disableThinking,
          `${tool} chat() call ${call.index} should have disableThinking=${expectedDisable}`,
        ).toBe(expectedDisable);
      }
    });
  }
});

describe('thinking-mode propagation — per-call override', () => {
  it('classify with thinking="off" inverts registry default ON', async () => {
    await client.callTool({
      name: 'classify',
      arguments: { ...MINIMAL_INPUTS.classify, thinking: 'off' },
    });
    expect(
      recorder.recorded.length,
      'classify must produce at least one backend.chat() call',
    ).toBeGreaterThan(0);
    expect(recorder.recorded[0].args.disableThinking).toBe(true);
  });

  it('summarize with thinking="on" inverts registry default OFF', async () => {
    await client.callTool({
      name: 'summarize',
      arguments: { ...MINIMAL_INPUTS.summarize, thinking: 'on' },
    });
    expect(
      recorder.recorded.length,
      'summarize must produce at least one backend.chat() call',
    ).toBeGreaterThan(0);
    expect(recorder.recorded[0].args.disableThinking).toBe(false);
  });

  it('classify with thinking="auto" yields registry default ON', async () => {
    await client.callTool({
      name: 'classify',
      arguments: { ...MINIMAL_INPUTS.classify, thinking: 'auto' },
    });
    expect(recorder.recorded.length).toBeGreaterThan(0);
    expect(recorder.recorded[0].args.disableThinking).toBe(false);
  });

  it('summarize with thinking="auto" yields registry default OFF', async () => {
    await client.callTool({
      name: 'summarize',
      arguments: { ...MINIMAL_INPUTS.summarize, thinking: 'auto' },
    });
    expect(recorder.recorded.length).toBeGreaterThan(0);
    expect(recorder.recorded[0].args.disableThinking).toBe(true);
  });
});

describe('thinking-mode propagation — env-var overrides registry', () => {
  it('OMCP_THINKING_MODE=on flips summarize default OFF → disableThinking=false', async () => {
    process.env.OMCP_THINKING_MODE = 'on';
    await client.callTool({
      name: 'summarize',
      arguments: MINIMAL_INPUTS.summarize,
    });
    expect(recorder.recorded.length).toBeGreaterThan(0);
    expect(recorder.recorded[0].args.disableThinking).toBe(false);
  });

  it('OMCP_THINKING_CLASSIFY=off flips classify default ON → disableThinking=true', async () => {
    process.env.OMCP_THINKING_CLASSIFY = 'off';
    await client.callTool({
      name: 'classify',
      arguments: MINIMAL_INPUTS.classify,
    });
    expect(recorder.recorded.length).toBeGreaterThan(0);
    expect(recorder.recorded[0].args.disableThinking).toBe(true);
  });

  it('per-tool env beats global env', async () => {
    process.env.OMCP_THINKING_MODE = 'on';
    process.env.OMCP_THINKING_SUMMARIZE = 'off';
    await client.callTool({
      name: 'summarize',
      arguments: MINIMAL_INPUTS.summarize,
    });
    expect(recorder.recorded.length).toBeGreaterThan(0);
    expect(recorder.recorded[0].args.disableThinking).toBe(true);
  });
});
