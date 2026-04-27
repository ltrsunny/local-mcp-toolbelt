/**
 * Thin parse-diff wrapper for `diff-semantic-index`.
 *
 * Converts raw `git diff` text into a structured summary that the LLM
 * handler can use as a pre-processed prompt prefix (paths, line counts, roles)
 * instead of forcing the model to scan raw unified-diff bytes.
 *
 * parse-diff v0.12 handles unified diff output from standard `git diff`.
 * Binary files come back with zero additions/deletions — we surface them
 * with `lines_changed: 0` and skip their bytes in the prompt.
 *
 * Never throws: a try/catch around the third-party call returns an empty
 * result on parse failure so the caller can still attempt the LLM call
 * with the raw text as a fallback.
 */

import parseDiff from 'parse-diff';

export interface DiffFileSummary {
  path: string;
  role: 'added' | 'modified' | 'deleted' | 'renamed';
  lines_changed: number;
  /** True when the path looks like a test/spec file. Used to compute
   *  test_coverage_hint without requiring the LLM to infer it. */
  is_test: boolean;
}

export interface ParsedDiff {
  files: DiffFileSummary[];
  total_additions: number;
  total_deletions: number;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const TEST_PATH_RE = /\.(test|spec)\.[cm]?[jt]sx?$|[/\\](?:tests?|__tests?__|__mocks?__|fixtures?)[/\\]/i;

function isTestFile(path: string): boolean {
  return TEST_PATH_RE.test(path);
}

function fileRole(
  file: parseDiff.File,
): 'added' | 'modified' | 'deleted' | 'renamed' {
  if (file.new === true) return 'added';
  if (file.deleted === true) return 'deleted';
  // parse-diff sets `from` and `to` to different strings for renames.
  if (file.from && file.to && file.from !== file.to) return 'renamed';
  return 'modified';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse raw unified diff text (typically `git diff` or `git diff --staged`
 * output) into a typed summary.
 *
 * @param diffText  Raw diff string. May be empty — returns empty result.
 * @returns         Structured summary; never throws.
 */
export function parseDiffText(diffText: string): ParsedDiff {
  if (!diffText.trim()) {
    return { files: [], total_additions: 0, total_deletions: 0 };
  }

  let rawFiles: parseDiff.File[];
  try {
    rawFiles = parseDiff(diffText);
  } catch {
    // parse-diff is robust but wrap anyway; caller can still attempt the LLM.
    return { files: [], total_additions: 0, total_deletions: 0 };
  }

  let total_additions = 0;
  let total_deletions = 0;
  const files: DiffFileSummary[] = [];

  for (const file of rawFiles) {
    // Deleted files have to === '/dev/null' — use `from` for the real path.
    const path = file.deleted === true
      ? (file.from ?? '(unknown)')
      : (file.to ?? file.from ?? '(unknown)');
    const role = fileRole(file);
    // additions + deletions == 0 for binary files — intentional.
    const lines_changed = file.additions + file.deletions;
    total_additions += file.additions;
    total_deletions += file.deletions;

    files.push({ path, role, lines_changed, is_test: isTestFile(path) });
  }

  return { files, total_additions, total_deletions };
}

/**
 * Derive `test_coverage_hint` from a parsed diff without running the LLM.
 * Result fed into the output schema so the model can confirm or correct it.
 */
export function deriveTestCoverageHint(
  parsed: ParsedDiff,
): 'tests_added' | 'tests_modified' | 'no_test_change' | 'unclear' {
  const testFiles = parsed.files.filter((f) => f.is_test);
  if (testFiles.length === 0) return 'no_test_change';
  const added = testFiles.some((f) => f.role === 'added');
  return added ? 'tests_added' : 'tests_modified';
}

/**
 * Format a ParsedDiff as a compact prompt section the LLM can read quickly.
 * Placed before the raw diff in the user message so the model has a
 * structured index before scanning the raw hunks.
 */
export function formatParsedDiffForPrompt(parsed: ParsedDiff): string {
  const lines: string[] = [
    `Files changed: ${parsed.files.length}`,
    `Total: +${parsed.total_additions} / -${parsed.total_deletions} lines`,
    '',
  ];
  for (const f of parsed.files) {
    lines.push(
      `[${f.role.toUpperCase().padEnd(8)}] ${f.path}` +
        (f.lines_changed > 0 ? ` (${f.lines_changed} lines)` : ' (binary)'),
    );
  }
  return lines.join('\n');
}
