/**
 * Unit tests for MlxHttpBackend.
 *
 * All HTTP is mocked via `vi.stubGlobal('fetch', ...)` — no real server needed.
 * Tests cover: chat, ping, abort, error paths, and JSON-mode routing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MlxHttpBackend } from '../../src/llm/mlx-http-backend.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function makeErrorResponse(status: number, body = ''): Response {
  return {
    ok: false,
    status,
    statusText: 'Error',
    json: async () => {
      throw new Error('not json');
    },
    text: async () => body,
  } as unknown as Response;
}

/** Build a minimal valid OpenAI chat completion response. */
function chatResponse(content: string, promptTokens = 10, completionTokens = 5) {
  return {
    id: 'mlx-42ms',
    object: 'chat.completion',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: 15 },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MlxHttpBackend', () => {
  let backend: MlxHttpBackend;
  const BASE_URL = 'http://127.0.0.1:8080';

  beforeEach(() => {
    // Supply modelName to skip the /v1/models auto-detect round-trip in tests
    // that focus on chat() behaviour rather than model resolution.
    backend = new MlxHttpBackend({ baseUrl: BASE_URL, numCtx: 16384, modelName: 'test-model' });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── modelId ────────────────────────────────────────────────────────────

  it('returns modelId including base URL and model name', () => {
    // modelName is known from construction → included immediately.
    expect(backend.modelId).toBe(`mlx-http:${BASE_URL}/test-model`);
  });

  it('returns modelId with only base URL when no modelName is configured', () => {
    const b = new MlxHttpBackend({ baseUrl: 'http://localhost:8080' });
    expect(b.modelId).toBe('mlx-http:http://localhost:8080');
  });

  it('strips trailing slash from base URL', () => {
    const b = new MlxHttpBackend({ baseUrl: 'http://localhost:8080/' });
    expect(b.modelId).toBe('mlx-http:http://localhost:8080');
  });

  // ── model name resolution ─────────────────────────────────────────────

  it('auto-detects model from /v1/models when modelName is not set', async () => {
    const b = new MlxHttpBackend({ baseUrl: BASE_URL });
    const modelsResponse = makeOkResponse({ object: 'list', data: [{ id: 'Qwen3-8B-4bit' }] });
    const chatOkResponse = makeOkResponse(chatResponse('hi'));
    // First call → /v1/models; second call → /v1/chat/completions
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(modelsResponse)
      .mockResolvedValueOnce(chatOkResponse));

    const result = await b.chat({ user: 'test', maxInputTokens: 4096 });
    expect(result.text).toBe('hi');
    expect(b.modelId).toBe(`mlx-http:${BASE_URL}/Qwen3-8B-4bit`);

    // Second call should NOT hit /v1/models again (cached).
    const chatOkResponse2 = makeOkResponse(chatResponse('hi2'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(chatOkResponse2));
    const result2 = await b.chat({ user: 'test2', maxInputTokens: 4096 });
    expect(result2.text).toBe('hi2');
    expect(vi.mocked(fetch).mock.calls.length).toBe(1); // only one fetch (no re-detect)
  });

  it('throws when /v1/models returns empty list', async () => {
    const b = new MlxHttpBackend({ baseUrl: BASE_URL });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeOkResponse({ data: [] })));
    await expect(b.chat({ user: 'hi', maxInputTokens: 4096 })).rejects.toThrow(/empty list/i);
  });

  // ── chat ──────────────────────────────────────────────────────────────

  it('sends a well-formed POST to /v1/chat/completions', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(chatResponse('Hello!')));
    vi.stubGlobal('fetch', mockFetch);

    const result = await backend.chat({
      user: 'Say hello',
      maxInputTokens: 4096,
      temperature: 0,
    });

    expect(result.text).toBe('Hello!');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/v1/chat/completions`);
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.model).toBe('test-model');
    // `/no_think` is appended to user content to disable Qwen3 thinking trace.
    expect(body.messages).toEqual([{ role: 'user', content: 'Say hello\n/no_think' }]);
    expect(body.temperature).toBe(0);
    // No response_format field when format is absent
    expect(body.response_format).toBeUndefined();
  });

  it('prepends a system message when opts.system is set', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(chatResponse('ok')));
    vi.stubGlobal('fetch', mockFetch);

    await backend.chat({
      system: 'You are terse.',
      user: 'Count to 3',
      maxInputTokens: 4096,
    });

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { messages: Array<{ role: string; content: string }> };
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are terse.' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Count to 3\n/no_think' });
  });

  it('adds response_format json_object when opts.format is set', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(chatResponse('{"label":"A"}')));
    vi.stubGlobal('fetch', mockFetch);

    await backend.chat({
      user: 'Classify',
      maxInputTokens: 4096,
      format: { type: 'object', properties: { label: { type: 'string' } } },
    });

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as {
      response_format?: {
        type: string;
        json_schema?: { name: string; strict: boolean; schema: unknown };
      };
    };
    expect(body.response_format?.type).toBe('json_schema');
    expect(body.response_format?.json_schema?.strict).toBe(true);
    // Strict-mode normalization: every object node gets
    // additionalProperties: false + required: <all property keys>.
    expect(body.response_format?.json_schema?.schema).toEqual({
      type: 'object',
      properties: { label: { type: 'string' } },
      additionalProperties: false,
      required: ['label'],
    });
  });

  it('passes maxOutputTokens as max_tokens', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(chatResponse('x')));
    vi.stubGlobal('fetch', mockFetch);

    await backend.chat({ user: 'hi', maxInputTokens: 4096, maxOutputTokens: 256 });

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { max_tokens?: number };
    expect(body.max_tokens).toBe(256);
  });

  it('omits max_tokens when maxOutputTokens is not set', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(chatResponse('x')));
    vi.stubGlobal('fetch', mockFetch);

    await backend.chat({ user: 'hi', maxInputTokens: 4096 });

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { max_tokens?: number };
    expect(body.max_tokens).toBeUndefined();
  });

  it('handles empty completions gracefully (no choices)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeOkResponse({ id: 'x', choices: [] }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await backend.chat({ user: 'hi', maxInputTokens: 4096 });
    expect(result.text).toBe('');
    expect(result.promptTokens).toBe(0);
    expect(result.completionTokens).toBe(0);
  });

  // ── error handling ────────────────────────────────────────────────────

  it('throws on non-2xx HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeErrorResponse(503, 'model not loaded')),
    );

    await expect(
      backend.chat({ user: 'hi', maxInputTokens: 4096 }),
    ).rejects.toThrow(/503/);
  });

  it('throws on malformed JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => {
        throw new SyntaxError('bad json');
      },
      text: async () => '',
    } as unknown as Response));

    await expect(
      backend.chat({ user: 'hi', maxInputTokens: 4096 }),
    ).rejects.toThrow(/parse JSON/i);
  });

  it('throws a network error when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    );

    await expect(
      backend.chat({ user: 'hi', maxInputTokens: 4096 }),
    ).rejects.toThrow(/network error.*ECONNREFUSED/i);
  });

  // ── AbortSignal ───────────────────────────────────────────────────────

  it('throws immediately when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      backend.chat({ user: 'hi', maxInputTokens: 4096 }, controller.signal),
    ).rejects.toThrow(/aborted before fetch/i);

    // fetch should not have been called
    expect(vi.mocked(fetch).mock.calls.length).toBe(0);
  });

  it('passes the AbortSignal to fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(chatResponse('done')));
    vi.stubGlobal('fetch', mockFetch);

    const controller = new AbortController();
    await backend.chat({ user: 'hi', maxInputTokens: 4096 }, controller.signal);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it('wraps AbortError as aborted message', async () => {
    const abortError = Object.assign(new Error('signal aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const controller = new AbortController();
    controller.abort();

    await expect(
      backend.chat({ user: 'hi', maxInputTokens: 4096 }, controller.signal),
    ).rejects.toThrow(/aborted/i);
  });

  // ── countTokens ───────────────────────────────────────────────────────

  it('returns ceil(chars / 3.5) as approximate token count', async () => {
    // "hello" = 5 chars → ceil(5/3.5) = 2
    expect(await backend.countTokens('hello')).toBe(2);
    // 35 chars → exactly 10
    expect(await backend.countTokens('a'.repeat(35))).toBe(10);
    // 36 chars → ceil(36/3.5) = ceil(10.28) = 11
    expect(await backend.countTokens('a'.repeat(36))).toBe(11);
    // empty string → 0
    expect(await backend.countTokens('')).toBe(0);
  });

  // ── ping ──────────────────────────────────────────────────────────────

  it('GET /health succeeds on 200', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await expect(backend.ping()).resolves.toBeUndefined();

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/health`);
    expect(init.method).toBe('GET');
  });

  it('throws on /health non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as Response));

    await expect(backend.ping()).rejects.toThrow(/503/);
  });

  it('throws on /health network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')));

    await expect(backend.ping()).rejects.toThrow(/unreachable/i);
  });
});
