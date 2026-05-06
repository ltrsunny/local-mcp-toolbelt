#!/usr/bin/env node
/**
 * Validate a fixture directory shape so the runner doesn't fail late.
 * Checks: meta.json present + parseable, kind is supported, required files
 * exist per kind. Does NOT validate semantic correctness of input/gold.
 *
 * Usage:
 *   node tests/eval/lib/validate-fixture.mjs              # validate all
 *   node tests/eval/lib/validate-fixture.mjs 03-classify  # validate one
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(SCRIPT_DIR, '..', 'fixtures');

const REQUIRED_BY_KIND = {
  'summarize-long': ['input_file', 'gold_file'],
  'classify':       ['input_file', 'gold_file', 'categories_file'],
  'extract':        ['input_file', 'gold_file', 'schema_file'],
  'transform':      ['input_file', 'gold_file', 'instruction'],
};

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function validateOne(dirName) {
  const dir = path.join(FIXTURES_DIR, dirName);
  const errs = [];
  const metaPath = path.join(dir, 'meta.json');
  if (!(await fileExists(metaPath))) {
    return { dir: dirName, ok: false, errs: ['meta.json missing'] };
  }
  let meta;
  try { meta = JSON.parse(await readFile(metaPath, 'utf8')); }
  catch (e) { return { dir: dirName, ok: false, errs: [`meta.json parse: ${e.message}`] }; }
  const kind = meta.kind;
  if (!REQUIRED_BY_KIND[kind]) {
    errs.push(`unknown kind: ${kind}`);
    return { dir: dirName, ok: false, errs };
  }
  for (const required of REQUIRED_BY_KIND[kind]) {
    if (required === 'instruction') {
      if (!meta.instruction || typeof meta.instruction !== 'string') {
        errs.push(`meta.instruction missing or not string`);
      }
    } else {
      const fname = meta[required];
      if (!fname) { errs.push(`meta.${required} not set`); continue; }
      if (!(await fileExists(path.join(dir, fname)))) errs.push(`missing file: ${fname}`);
    }
  }
  // For classify, parse categories.json and check it's an array of strings
  if (kind === 'classify' && meta.categories_file) {
    try {
      const cats = JSON.parse(await readFile(path.join(dir, meta.categories_file), 'utf8'));
      if (!Array.isArray(cats) || cats.length < 2 || !cats.every((c) => typeof c === 'string')) {
        errs.push('categories.json must be an array of ≥2 strings');
      }
    } catch (e) {
      errs.push(`categories.json parse: ${e.message}`);
    }
  }
  // For extract, parse schema.json and gold.json
  if (kind === 'extract') {
    try {
      const schema = JSON.parse(await readFile(path.join(dir, meta.schema_file), 'utf8'));
      if (schema.type !== 'object' || !schema.properties) {
        errs.push('schema.json must be {type:"object", properties:{...}}');
      }
    } catch (e) {
      errs.push(`schema.json parse: ${e.message}`);
    }
    try { JSON.parse(await readFile(path.join(dir, meta.gold_file), 'utf8')); }
    catch (e) { errs.push(`gold.json parse: ${e.message}`); }
  }
  if (kind === 'classify') {
    try {
      const g = JSON.parse(await readFile(path.join(dir, meta.gold_file), 'utf8'));
      if (!g || !Array.isArray(g.labels)) errs.push('gold.json must be {labels:[...]}');
    } catch (e) { errs.push(`gold.json parse: ${e.message}`); }
  }
  return { dir: dirName, ok: errs.length === 0, errs };
}

async function main() {
  const target = process.argv[2];
  const dirs = target ? [target] : (await readdir(FIXTURES_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  let pass = 0, fail = 0;
  for (const d of dirs) {
    const r = await validateOne(d);
    if (r.ok) {
      console.log(`✓ ${d}`);
      pass++;
    } else {
      console.log(`✗ ${d}`);
      for (const e of r.errs) console.log(`    - ${e}`);
      fail++;
    }
  }
  console.log(`\n${pass}/${pass + fail} fixtures valid.`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
