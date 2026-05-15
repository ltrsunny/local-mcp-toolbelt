/**
 * Unit tests for the per-tool thinking-mode resolver
 * (`src/config/thinking-defaults.ts`).
 *
 * Tests the 4-level resolution order documented in scope memo v0.6.0 §4:
 *   1. Per-call explicit value
 *   2. Per-tool env var `OMCP_THINKING_<TOOL_NAME>`
 *   3. Global env var `OMCP_THINKING_MODE`
 *   4. Registry default
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  THINKING_DEFAULTS,
  envKeyFor,
  resolveThinking,
} from '../../src/config/thinking-defaults.js';

describe('thinking-defaults: registry', () => {
  it('classify / extract / transform / diff-semantic-index default ON', () => {
    expect(THINKING_DEFAULTS.classify).toBe('on');
    expect(THINKING_DEFAULTS.extract).toBe('on');
    expect(THINKING_DEFAULTS.transform).toBe('on');
    expect(THINKING_DEFAULTS['diff-semantic-index']).toBe('on');
  });

  it('summarize variants default OFF (prose loses with thinking)', () => {
    expect(THINKING_DEFAULTS.summarize).toBe('off');
    expect(THINKING_DEFAULTS['summarize-long']).toBe('off');
    expect(THINKING_DEFAULTS['summarize-long-chunked']).toBe('off');
  });
});

describe('thinking-defaults: envKeyFor', () => {
  it('uppercases + replaces hyphens with underscores', () => {
    expect(envKeyFor('summarize')).toBe('OMCP_THINKING_SUMMARIZE');
    expect(envKeyFor('summarize-long')).toBe('OMCP_THINKING_SUMMARIZE_LONG');
    expect(envKeyFor('diff-semantic-index')).toBe(
      'OMCP_THINKING_DIFF_SEMANTIC_INDEX',
    );
  });
});

describe('thinking-defaults: resolveThinking', () => {
  // Save + restore env across each test so per-tool / global env vars
  // from one case don't leak into the next.
  const savedEnv: Record<string, string | undefined> = {};
  const envKeysToClear = [
    'OMCP_THINKING_MODE',
    'OMCP_THINKING_SUMMARIZE',
    'OMCP_THINKING_CLASSIFY',
    'OMCP_THINKING_TRANSFORM',
    'OMCP_THINKING_DIFF_SEMANTIC_INDEX',
    'OMCP_THINKING_UNKNOWN_TOOL',
  ];

  beforeEach(() => {
    for (const k of envKeysToClear) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of envKeysToClear) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  // ── Level 1: per-call ────────────────────────────────────────────────

  it('per-call "on" overrides every other level', () => {
    process.env.OMCP_THINKING_MODE = 'off';
    process.env.OMCP_THINKING_SUMMARIZE = 'off';
    expect(resolveThinking('summarize', 'on')).toBe('on');
  });

  it('per-call "off" overrides every other level', () => {
    process.env.OMCP_THINKING_MODE = 'on';
    process.env.OMCP_THINKING_CLASSIFY = 'on';
    expect(resolveThinking('classify', 'off')).toBe('off');
  });

  it('per-call "auto" falls through to lower levels', () => {
    // No env vars set → registry default for classify is 'on'
    expect(resolveThinking('classify', 'auto')).toBe('on');
  });

  it('per-call undefined falls through to lower levels', () => {
    expect(resolveThinking('summarize', undefined)).toBe('off');
  });

  // ── Level 2: per-tool env var ────────────────────────────────────────

  it('per-tool env var overrides global env and registry', () => {
    process.env.OMCP_THINKING_MODE = 'on';
    process.env.OMCP_THINKING_SUMMARIZE = 'on';
    expect(resolveThinking('summarize')).toBe('on');
  });

  it('per-tool env var key uses uppercase + underscores', () => {
    process.env.OMCP_THINKING_DIFF_SEMANTIC_INDEX = 'off';
    expect(resolveThinking('diff-semantic-index')).toBe('off');
  });

  it('invalid per-tool env value falls through', () => {
    // 'yes' / 'true' / etc. are not accepted — only 'on' or 'off'
    process.env.OMCP_THINKING_SUMMARIZE = 'yes';
    expect(resolveThinking('summarize')).toBe('off'); // registry default
  });

  // ── Level 3: global env var ──────────────────────────────────────────

  it('global env var overrides registry but not per-tool', () => {
    process.env.OMCP_THINKING_MODE = 'on';
    expect(resolveThinking('summarize')).toBe('on'); // overrides off default
    expect(resolveThinking('classify')).toBe('on'); // matches default
  });

  it('global "off" suppresses thinking everywhere', () => {
    process.env.OMCP_THINKING_MODE = 'off';
    expect(resolveThinking('classify')).toBe('off');
    expect(resolveThinking('transform')).toBe('off');
  });

  // ── Level 4: registry default ────────────────────────────────────────

  it('registry default applies when nothing else is set', () => {
    expect(resolveThinking('classify')).toBe('on');
    expect(resolveThinking('summarize')).toBe('off');
    expect(resolveThinking('transform')).toBe('on');
    expect(resolveThinking('summarize-long-chunked')).toBe('off');
  });

  it('unknown tool defaults to off (safer for unknown tools)', () => {
    expect(resolveThinking('not-a-registered-tool')).toBe('off');
  });

  it('unknown tool still honors per-call override', () => {
    expect(resolveThinking('not-a-registered-tool', 'on')).toBe('on');
  });

  it('unknown tool still honors per-tool env override', () => {
    process.env.OMCP_THINKING_UNKNOWN_TOOL = 'on';
    expect(resolveThinking('unknown-tool')).toBe('on');
  });
});
