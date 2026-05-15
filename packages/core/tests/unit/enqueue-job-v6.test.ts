/**
 * Unit tests for the v0.6.0 `enqueue_job` MCP tool registration.
 *
 * Mirrors the test scaffold in `enqueue-job.test.ts` (real JobStore +
 * JobRegistry + JobRunner; fake ToolInvoker). Focuses on the v0.6.0
 * additions: `thinking` opt-in, `thinking_resolved` persistence + hash,
 * `result_uri` shape, and `wait_command` capability gating.
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
/** Captured args from the most recent runner invocation (set by the fake invoker). */
let lastInvokerArgs: Record<string, unknown> | undefined;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'omcp-enqueue-v6-test-'));
  store = new JobStore({ baseDir: tmpDir });
  registry = new JobRegistry(store);
  await registry.initialize();

  toolHandlers = new Map();
  lastInvokerArgs = undefined;

  runner = new JobRunner(
    registry,
    async (toolName, args, _extra) => {
      lastInvokerArgs = args;
      const handler = toolHandlers.get(toolName);
      if (!handler) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown: ${toolName}` }],
        };
      }
      // Cast — toolHandlers payloads are MCP tool results; runner expects
      // the same shape.
      return (await handler(args, _extra)) as {
        content: Array<{ type: 'text'; text: string }>;
        isError?: boolean;
      };
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
  client = new Client({ name: 'enqueue-job-v6-test', version: '0.0.0' });
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
  await runner.waitIdle();
  await rm(tmpDir, { recursive: true, force: true });
  delete process.env.OMCP_ASSUME_BASH_CLIENT;
  delete process.env.OMCP_THINKING_MODE;
});

/**
 * Parse the JSON payload from a tool-call response. Throws if the response
 * isn't shaped as expected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseResp(res: any): Record<string, unknown> {
  const text = res.content[0].text;
  return JSON.parse(text) as Record<string, unknown>;
}

describe('enqueue_job — registration + shape', () => {
  it('appears in tools/list', async () => {
    const list = await client.listTools();
    expect(list.tools.find((t) => t.name === 'enqueue_job')).toBeDefined();
  });

  it('returns job_id, enqueued_at, expires_at, result_uri, thinking_resolved', async () => {
    const res = await client.callTool({
      name: 'enqueue_job',
      arguments: {
        tool: 'classify',
        args: { text: 'hi', categories: ['a', 'b'] },
      },
    });
    const body = parseResp(res);
    expect(body.job_id).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(body.enqueued_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.result_uri).toMatch(/^file:\/\/.+\.md$/);
    expect(body.thinking_resolved).toBe('on'); // classify default
  });

  it('omits wait_command when client does NOT advertise bash capability', async () => {
    delete process.env.OMCP_ASSUME_BASH_CLIENT;
    const res = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] } },
    });
    expect(parseResp(res).wait_command).toBeUndefined();
  });

  it('includes wait_command when OMCP_ASSUME_BASH_CLIENT=1', async () => {
    process.env.OMCP_ASSUME_BASH_CLIENT = '1';
    const res = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] } },
    });
    const body = parseResp(res);
    expect(typeof body.wait_command).toBe('string');
    expect(body.wait_command).toMatch(/^while \[ ! -f .+ \]; do sleep 5; done; cat .+$/);
    // POSIX-only — no [[ or zsh-isms
    expect(body.wait_command).not.toContain('[[');
  });

  it('wait_command shell-quotes the result_uri path (post-review fix)', async () => {
    process.env.OMCP_ASSUME_BASH_CLIENT = '1';
    const res = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] } },
    });
    const body = parseResp(res);
    const cmd = body.wait_command as string;
    // Path should be wrapped in single quotes — defends against spaces,
    // $, `, etc. in the user's OMCP_MEMORY_DIR override. Adversarial-
    // review fix; 3/3 voices flagged unquoted interpolation as
    // revert-worthy.
    expect(cmd).toMatch(/\[ ! -f '[^']+\.md' \]/);
    expect(cmd).toMatch(/cat '[^']+\.md'/);
  });
});

describe('enqueue_job — thinking resolution', () => {
  it('per-call thinking="on" overrides registry default-off (summarize)', async () => {
    const res = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'summarize', args: { text: 'x' }, thinking: 'on' },
    });
    expect(parseResp(res).thinking_resolved).toBe('on');
  });

  it('per-call thinking="off" overrides registry default-on (classify)', async () => {
    const res = await client.callTool({
      name: 'enqueue_job',
      arguments: {
        tool: 'classify',
        args: { text: 'x', categories: ['a', 'b'] },
        thinking: 'off',
      },
    });
    expect(parseResp(res).thinking_resolved).toBe('off');
  });

  it('per-call thinking="auto" falls through to registry default', async () => {
    const res = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'summarize', args: { text: 'x' }, thinking: 'auto' },
    });
    expect(parseResp(res).thinking_resolved).toBe('off');
  });

  it('global env var OMCP_THINKING_MODE=on lifts default-off', async () => {
    process.env.OMCP_THINKING_MODE = 'on';
    const res = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'summarize', args: { text: 'x' } },
    });
    expect(parseResp(res).thinking_resolved).toBe('on');
  });
});

describe('enqueue_job — runner integration', () => {
  it("injects thinking into args before invoking wrapped tool", async () => {
    // Register a fake summarize handler so the runner has a target.
    toolHandlers.set('summarize', async (args) => {
      // Tool sees args.thinking set by runner.
      return { content: [{ type: 'text', text: `received thinking=${(args as Record<string, unknown>).thinking}` }] };
    });

    await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'summarize', args: { text: 'hello' }, thinking: 'on' },
    });
    await runner.waitIdle();

    expect(lastInvokerArgs).toBeDefined();
    expect(lastInvokerArgs?.thinking).toBe('on');
    expect(lastInvokerArgs?.text).toBe('hello');
  });

  it('runner deep-clones args so handler mutations do not leak (post-review fix)', async () => {
    // Handler mutates a nested array inside args. Adversarial-review fix:
    // runner must deep-clone via structuredClone so the in-memory job
    // state is unaffected. 3/3 voices flagged the prior shallow spread.
    toolHandlers.set('classify', async (args) => {
      const a = args as { categories: string[] };
      a.categories.push('mutated-by-handler');
      return { content: [{ type: 'text', text: 'ok' }] };
    });

    const e = await client.callTool({
      name: 'enqueue_job',
      arguments: {
        tool: 'classify',
        args: { text: 'x', categories: ['original-a', 'original-b'] },
      },
    });
    const { job_id } = parseResp(e);
    await runner.waitIdle();

    // The persisted job's args.categories must still equal the original;
    // the handler's mutation should have hit the clone, not the source.
    const meta = await registry.getMeta(job_id);
    const persistedCategories = (meta?.args as { categories: string[] })
      .categories;
    expect(persistedCategories).toEqual(['original-a', 'original-b']);
    expect(persistedCategories).not.toContain('mutated-by-handler');
  });
});

describe('enqueue_job — dedup includes thinking_resolved', () => {
  it('same tool+args+thinking returns the SAME job_id', async () => {
    const r1 = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] }, thinking: 'on' },
    });
    const r2 = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] }, thinking: 'on' },
    });
    expect(parseResp(r1).job_id).toBe(parseResp(r2).job_id);
  });

  it('same tool+args but DIFFERENT thinking returns DIFFERENT job_id', async () => {
    const r1 = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] }, thinking: 'on' },
    });
    const r2 = await client.callTool({
      name: 'enqueue_job',
      arguments: { tool: 'classify', args: { text: 'x', categories: ['a', 'b'] }, thinking: 'off' },
    });
    expect(parseResp(r1).job_id).not.toBe(parseResp(r2).job_id);
  });
});
