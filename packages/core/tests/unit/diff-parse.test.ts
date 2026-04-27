/**
 * Unit tests for src/diff/parse.ts — the parse-diff wrapper.
 *
 * Uses real fixture diffs checked in to tests/fixtures/:
 *   sample.diff   — 3 new-file additions (progress-capture.ts, runner.ts, job-runner.test.ts)
 *   deleted.diff  — 1 deleted file
 *   renamed.diff  — 1 renamed file
 *
 * No Ollama required; pure in-process.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseDiffText,
  deriveTestCoverageHint,
  formatParsedDiffForPrompt,
} from '../../src/diff/parse.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dir, '../fixtures');

function fixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

// ── parseDiffText ─────────────────────────────────────────────────────────────

describe('parseDiffText — sample.diff (3 added files)', () => {
  const result = parseDiffText(fixture('sample.diff'));

  it('parses all 3 files', () => {
    expect(result.files).toHaveLength(3);
  });

  it('classifies all as role=added (new files)', () => {
    for (const f of result.files) {
      expect(f.role).toBe('added');
    }
  });

  it('marks job-runner.test.ts as is_test=true', () => {
    const testFile = result.files.find((f) => f.path.includes('.test.'));
    expect(testFile).toBeDefined();
    expect(testFile?.is_test).toBe(true);
  });

  it('marks source files as is_test=false', () => {
    const srcFiles = result.files.filter((f) => !f.path.includes('test'));
    expect(srcFiles.length).toBeGreaterThan(0);
    for (const f of srcFiles) {
      expect(f.is_test).toBe(false);
    }
  });

  it('counts lines_changed > 0 for added files', () => {
    for (const f of result.files) {
      expect(f.lines_changed).toBeGreaterThan(0);
    }
  });

  it('sums total_additions across all files', () => {
    const expected = result.files.reduce((s, f) => s + f.lines_changed, 0);
    expect(result.total_additions).toBe(expected);
    expect(result.total_deletions).toBe(0);
  });
});

describe('parseDiffText — deleted.diff', () => {
  it('classifies the file as role=deleted', () => {
    const result = parseDiffText(fixture('deleted.diff'));
    expect(result.files[0]?.role).toBe('deleted');
  });

  it('resolves path from the `from` field, not /dev/null', () => {
    const result = parseDiffText(fixture('deleted.diff'));
    expect(result.files[0]?.path).toBe('src/old-util.ts');
  });

  it('has total_deletions > 0 and total_additions == 0', () => {
    const result = parseDiffText(fixture('deleted.diff'));
    expect(result.total_deletions).toBeGreaterThan(0);
    expect(result.total_additions).toBe(0);
  });
});

describe('parseDiffText — renamed.diff', () => {
  it('classifies the file as role=renamed', () => {
    const result = parseDiffText(fixture('renamed.diff'));
    expect(result.files[0]?.role).toBe('renamed');
  });

  it('uses the destination (to) path as the file path', () => {
    const result = parseDiffText(fixture('renamed.diff'));
    expect(result.files[0]?.path).toBe('src/bar.ts');
  });
});

describe('parseDiffText — edge cases', () => {
  it('returns empty result for empty string', () => {
    const result = parseDiffText('');
    expect(result.files).toHaveLength(0);
    expect(result.total_additions).toBe(0);
    expect(result.total_deletions).toBe(0);
  });

  it('returns empty result for whitespace-only input', () => {
    const result = parseDiffText('   \n\t\n');
    expect(result.files).toHaveLength(0);
  });
});

// ── deriveTestCoverageHint ────────────────────────────────────────────────────

describe('deriveTestCoverageHint', () => {
  it('returns tests_added when a new test file was added', () => {
    const result = parseDiffText(fixture('sample.diff'));
    expect(deriveTestCoverageHint(result)).toBe('tests_added');
  });

  it('returns no_test_change when only non-test files changed', () => {
    const result = parseDiffText(fixture('deleted.diff'));
    expect(deriveTestCoverageHint(result)).toBe('no_test_change');
  });

  it('returns tests_modified when test file was modified (not added)', () => {
    const parsed = {
      files: [
        {
          path: 'tests/unit/foo.test.ts',
          role: 'modified' as const,
          lines_changed: 5,
          is_test: true,
        },
      ],
      total_additions: 5,
      total_deletions: 0,
    };
    expect(deriveTestCoverageHint(parsed)).toBe('tests_modified');
  });

  it('returns no_test_change for empty parsed diff', () => {
    const parsed = { files: [], total_additions: 0, total_deletions: 0 };
    expect(deriveTestCoverageHint(parsed)).toBe('no_test_change');
  });
});

// ── formatParsedDiffForPrompt ─────────────────────────────────────────────────

describe('formatParsedDiffForPrompt', () => {
  it('includes the file count in output', () => {
    const result = parseDiffText(fixture('sample.diff'));
    const formatted = formatParsedDiffForPrompt(result);
    expect(formatted).toContain('Files changed: 3');
  });

  it('includes totals with + and - signs', () => {
    const result = parseDiffText(fixture('sample.diff'));
    const formatted = formatParsedDiffForPrompt(result);
    expect(formatted).toMatch(/\+\d+/);
  });

  it('includes each file path', () => {
    const result = parseDiffText(fixture('sample.diff'));
    const formatted = formatParsedDiffForPrompt(result);
    for (const f of result.files) {
      expect(formatted).toContain(f.path);
    }
  });

  it('shows role in uppercase', () => {
    const result = parseDiffText(fixture('sample.diff'));
    const formatted = formatParsedDiffForPrompt(result);
    expect(formatted).toContain('ADDED');
  });

  it('shows (binary) for zero lines_changed', () => {
    const parsed = {
      files: [
        { path: 'assets/logo.png', role: 'modified' as const, lines_changed: 0, is_test: false },
      ],
      total_additions: 0,
      total_deletions: 0,
    };
    const formatted = formatParsedDiffForPrompt(parsed);
    expect(formatted).toContain('(binary)');
  });
});
