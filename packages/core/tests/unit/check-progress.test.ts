/**
 * Unit tests for v0.6.0's `check_progress` MCP tool.
 *
 * `check_progress` is the cross-client universal poll: instant return, no
 * long-poll, no Bash dependency. The opposite design point from
 * `wait_for_job` (v0.3.0 long-poll) and `wait_command` (Claude-Code-only
 * Bash one-liner from enqueue_job).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import {
  buildBridgeServer,
  type CapturedToolHandler,
} from '../../src/mcp/server.js';
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
let toolHandlers: Map<string, CapturedToolHandler>;
let client: Client;
/** Hold one fake-tool resolve until released — lets tests freeze a job in 'running'. */
let releaseRunningHandler: (() => void) | undefined;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'omcp-check-progress-test-'));
  store = new JobStore({ baseDir: tmpDir });
  registry = new JobRegistry(store);
  await registry.initialize();

  toolHandlers = new Map();
  runner = new JobRunner(
    registry,
    async (toolName, _args, _extra) => {
      const handler = toolHandlers.get(toolName);
      if (!handler) {
        return { isError: true, content: [{ type: 'text', text: `Unknown: ${toolName}` }] };
      }
      return (await handler(_args, _extra)) as { content: Array<{ type: 'text'; text: string }>; isError?: boolean };
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
  client = new Client({ name: 'check-progress-test', version: '0.0.0' });
  await client.connect(clientTransport);
});

afterEach(async () => {
  if (releaseRunningHandler) {
    releaseRunningHandler();
    releaseRunningHandler = undefined;
  }
  await client.close();
  await runner.waitIdle();
  await rm(tmpDir, { recursive: true, force: true });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseResp(res: any): Record<string, unknown> {
  return JSON.parse(res.content[0].text) as Record<string, unknown>;
}

describe('check_progress — registration', () => {
  it('appears in tools/list', async () => {
    const list = await client.listTools();
    expect(list.tools.find((t) => t.name === 'check_progress')).toBeDefined();
  });
});

describe('check_progress — status shape', () => {
  it('returns {status: "done"} for a completed job', async () => {
    toolHandlers.set('classify', async () => ({
      content: [{ type: 'text', text: 'positive' }],
    }));
    const e = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] } },
    });
    const { job_id } = parseResp(e);
    await runner.waitIdle();

    const res = await client.callTool({
      name: 'check_progress',
      arguments: { job_id },
    });
    expect(parseResp(res).status).toBe('done');
  });

  it('returns {status: "running"} for an in-flight job', async () => {
    // Install a handler that blocks until manually released.
    const blockedPromise = new Promise<void>((resolve) => {
      releaseRunningHandler = resolve;
    });
    toolHandlers.set('classify', async () => {
      await blockedPromise;
      return { content: [{ type: 'text', text: 'done' }] };
    });
    const e = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] } },
    });
    const { job_id } = parseResp(e);

    // Give the runner a chance to pick up the job and mark it running.
    await new Promise((r) => setTimeout(r, 50));

    const res = await client.callTool({
      name: 'check_progress',
      arguments: { job_id },
    });
    const body = parseResp(res);
    expect(['queued', 'running']).toContain(body.status); // either is acceptable depending on timing
    expect(body.error).toBeUndefined();
  });

  it('returns {status: "failed", error: ...} for a failed job', async () => {
    toolHandlers.set('classify', async () => ({
      isError: true,
      content: [{ type: 'text', text: 'simulated failure' }],
    }));
    const e = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] } },
    });
    const { job_id } = parseResp(e);
    await runner.waitIdle();

    const res = await client.callTool({
      name: 'check_progress',
      arguments: { job_id },
    });
    const body = parseResp(res);
    expect(body.status).toBe('failed');
    expect(typeof body.error).toBe('string');
    expect(body.error).toContain('simulated failure');
  });

  it('returns isError for unknown job_id', async () => {
    const res = await client.callTool({
      name: 'check_progress',
      arguments: { job_id: 'this_job_does_not_exist_12345' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((res as any).isError).toBe(true);
  });
});
