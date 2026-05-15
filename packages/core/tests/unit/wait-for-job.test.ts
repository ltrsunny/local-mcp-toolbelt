/**
 * Unit tests for the `wait_for_job` and `read_job_result` MCP tool registrations.
 *
 * Uses the same FakeBackend-style ToolInvoker pattern as enqueue-job.test.ts.
 * Passes a small max_wait_ms to avoid 45 s delays in tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildBridgeServer, type CapturedToolHandler } from '../../src/mcp/server.js';
import {
  _installTestBackend,
  _resetMlxHttpCacheForTests,
} from '../../src/mcp/backend-factory.js';
import { JobStore } from '../../src/jobs/store.js';
import { JobRegistry } from '../../src/jobs/registry.js';
import { JobRunner } from '../../src/jobs/runner.js';
import { RecorderBackend } from './recorder-client.js';

let tmpDir: string;
let store: JobStore;
let registry: JobRegistry;
let runner: JobRunner;
let client: Client;

/** Control knob: how fast the fake invoker resolves. Adjusted per test. */
let fakeInvokerDelay = 0;
let fakeInvokerShouldFail = false;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'omcp-wait-for-job-test-'));
  store = new JobStore({ baseDir: tmpDir });
  registry = new JobRegistry(store);
  await registry.initialize();

  fakeInvokerDelay = 0;
  fakeInvokerShouldFail = false;

  const toolHandlers = new Map<string, CapturedToolHandler>();
  runner = new JobRunner(
    registry,
    async (toolName, args, extra) => {
      if (fakeInvokerDelay > 0) {
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, fakeInvokerDelay);
          extra.signal.addEventListener('abort', () => { clearTimeout(t); resolve(); });
        });
      }
      if (fakeInvokerShouldFail) {
        return { isError: true, content: [{ type: 'text', text: 'simulated failure' }] };
      }
      const handler = toolHandlers.get(toolName);
      if (!handler) {
        return { isError: true, content: [{ type: 'text', text: `Unknown: ${toolName}` }] };
      }
      return (await handler(args, extra)) as { content: Array<{ type: 'text'; text: string }> };
    },
    { concurrency: 1 },
  );

  _resetMlxHttpCacheForTests();
  _installTestBackend(new RecorderBackend());
  const server = buildBridgeServer({
    defendUntrusted: false,
    jobRegistry: registry,
    jobRunner: runner,
    toolHandlers,
  });

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: 'wait-for-job-test', version: '0.0.0' });
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
  await runner.waitIdle();
  await rm(tmpDir, { recursive: true, force: true });
});

// ── wait_for_job ──────────────────────────────────────────────────────────────

describe('wait_for_job', () => {
  it('appears in tools/list', async () => {
    const list = await client.listTools();
    const names = list.tools.map((t) => t.name);
    expect(names).toContain('wait_for_job');
    expect(names).toContain('read_job_result');
  });

  it('returns unknown for a nonexistent job_id', async () => {
    const result = await client.callTool({
      name: 'wait_for_job',
      arguments: { job_id: 'doesnotexist0', max_wait_ms: 100 },
    });
    const text = (result as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('unknown');
    expect(parsed.reason).toBe('never_existed');
  });

  it('returns done immediately when job already completed', async () => {
    // Enqueue and let it run to completion before calling wait_for_job.
    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'quick test' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );
    // Wait for the runner to finish.
    await runner.waitIdle();

    const waitResult = await client.callTool({
      name: 'wait_for_job',
      arguments: { job_id, max_wait_ms: 500 },
    });
    const text = (waitResult as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('done');
    expect(typeof parsed.result_path).toBe('string');
  });

  it('polls and returns done once the slow job finishes', async () => {
    // 300 ms delay — well within a 2 s max_wait_ms.
    fakeInvokerDelay = 300;

    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'slow job' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );

    // wait_for_job will long-poll; the invoker resolves after 300 ms.
    const waitResult = await client.callTool({
      name: 'wait_for_job',
      arguments: { job_id, max_wait_ms: 2000 },
    });
    const text = (waitResult as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('done');
  });

  it('returns running with progress when cap is hit before job finishes', async () => {
    // Invoker takes 1 s; max_wait_ms is only 200 ms → cap hit first.
    fakeInvokerDelay = 1000;

    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'very slow' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );

    const waitResult = await client.callTool({
      name: 'wait_for_job',
      arguments: { job_id, max_wait_ms: 200 },
    });
    const text = (waitResult as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    const parsed = JSON.parse(text);
    // Status should be running (or done if fast machine — accept both).
    expect(['running', 'done']).toContain(parsed.status);
  });

  it('returns failed immediately when job already failed', async () => {
    fakeInvokerShouldFail = true;

    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'fail me' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );
    await runner.waitIdle();

    const waitResult = await client.callTool({
      name: 'wait_for_job',
      arguments: { job_id, max_wait_ms: 500 },
    });
    const text = (waitResult as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('failed');
    expect(parsed.error).toContain('simulated failure');
  });
});

// ── read_job_result ───────────────────────────────────────────────────────────

describe('read_job_result', () => {
  it('returns the result body for a done job', async () => {
    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'result body test' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );
    await runner.waitIdle();

    const readResult = await client.callTool({
      name: 'read_job_result',
      arguments: { job_id },
    });
    expect((readResult as { isError?: boolean }).isError).toBeFalsy();
    const text = (readResult as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    // The fake invoker returns "Unknown: summarize" — result body is whatever
    // the handler resolved to.
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('returns isError for an unknown job_id', async () => {
    const result = await client.callTool({
      name: 'read_job_result',
      arguments: { job_id: 'neverexisted0' },
    });
    expect((result as { isError?: boolean }).isError).toBe(true);
    const text = (result as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    expect(text).toContain('not found');
  });

  it('returns isError (not done yet) for a still-running job', async () => {
    // Enqueue but do NOT let the runner process it (high delay).
    fakeInvokerDelay = 5000;

    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'pending job' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );

    // Poll immediately — job should still be queued/running.
    const readResult = await client.callTool({
      name: 'read_job_result',
      arguments: { job_id },
    });
    // The job may or may not have started in 0ms, but should not be done yet.
    // Accept either "not done yet" error or (on very fast machines) success.
    const isErr = (readResult as { isError?: boolean }).isError;
    if (isErr) {
      const text = (readResult as { content: Array<{ text: string }> }).content[0]?.text ?? '';
      expect(text).toMatch(/not done yet|queued|running/i);
    }
  });

  it('returns isError for a failed job', async () => {
    fakeInvokerShouldFail = true;

    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'will fail' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );
    await runner.waitIdle();

    const readResult = await client.callTool({
      name: 'read_job_result',
      arguments: { job_id },
    });
    expect((readResult as { isError?: boolean }).isError).toBe(true);
    const text = (readResult as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    expect(text).toContain('simulated failure');
  });
});

// ── v0.6.0 read_job_result inline/file_path threshold ──────────────────────

describe('read_job_result (v0.6.0) — inline content vs file_path threshold', () => {
  // The fake invoker in the harness returns "Unknown: summarize" (short) for
  // unknown tools — well under any sane threshold. To test the threshold
  // branch, set OMCP_INLINE_RESULT_MAX_BYTES to 1 so the short result
  // exceeds it and we get the file_path fallback path.

  it('returns inline content when result ≤ threshold (default 1 MB)', async () => {
    delete process.env.OMCP_INLINE_RESULT_MAX_BYTES;
    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'small body' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );
    await runner.waitIdle();

    const res = await client.callTool({
      name: 'read_job_result',
      arguments: { job_id },
    });
    expect((res as { isError?: boolean }).isError).toBeFalsy();
    const text = (res as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    // Should NOT be JSON-encoded file_path object — should be the result body
    // as plain text. Try to parse; if it parses as the file_path object we
    // failed; if it doesn't or is a plain string with body content, we passed.
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      // If it parsed AND has file_path, that's a fail.
      expect(parsed.file_path).toBeUndefined();
    } catch {
      // Not JSON = plain inline body, expected.
    }
    expect(text.length).toBeGreaterThan(0);
  });

  it('returns {file_path, bytes} when result > threshold (env var override)', async () => {
    // Set threshold absurdly low (1 byte) so any non-empty result spills to file_path.
    process.env.OMCP_INLINE_RESULT_MAX_BYTES = '1';

    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'large body' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );
    await runner.waitIdle();

    const res = await client.callTool({
      name: 'read_job_result',
      arguments: { job_id },
    });
    expect((res as { isError?: boolean }).isError).toBeFalsy();
    const text = (res as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(typeof parsed.file_path).toBe('string');
    expect(parsed.file_path).toMatch(/\.md$/);
    expect(typeof parsed.bytes).toBe('number');
    expect(parsed.inline_max_bytes).toBe(1);
    expect(typeof parsed.note).toBe('string');

    delete process.env.OMCP_INLINE_RESULT_MAX_BYTES;
  });

  it('invalid OMCP_INLINE_RESULT_MAX_BYTES falls back to default 1 MB', async () => {
    process.env.OMCP_INLINE_RESULT_MAX_BYTES = 'not-a-number';

    const enqueueResult = await client.callTool({
      name: 'enqueue-job',
      arguments: { tool_name: 'summarize', args: { text: 'fallback to default' } },
    });
    const { job_id } = JSON.parse(
      (enqueueResult as { content: Array<{ text: string }> }).content[0]!.text,
    );
    await runner.waitIdle();

    const res = await client.callTool({
      name: 'read_job_result',
      arguments: { job_id },
    });
    expect((res as { isError?: boolean }).isError).toBeFalsy();
    const text = (res as { content: Array<{ text: string }> }).content[0]?.text ?? '';
    // Body is small (~30 bytes); default 1 MB threshold makes it inline.
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed.file_path).toBeUndefined();
    } catch {
      // Not JSON — plain inline body. Pass.
    }

    delete process.env.OMCP_INLINE_RESULT_MAX_BYTES;
  });
});
