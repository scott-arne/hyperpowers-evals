import { basename, join } from 'node:path';
import { stat } from 'node:fs/promises';
import { listFiles, readJson, ROOT } from '../lib/fs.js';
import { duplicates } from './rules/duplicates.js';
import { freshness } from './rules/freshness.js';
import { nulls } from './rules/nulls.js';
import { schema } from './rules/schema.js';
import { size } from './rules/size.js';
import { timestamps } from './rules/timestamps.js';

// Each rule takes one snapshot and returns its problems as strings.
export const RULES = [schema, timestamps, freshness, duplicates, nulls, size];

export async function verifyDir(dir, { now }) {
  const report = [];
  for (const path of await listFiles(dir, '.json')) {
    const name = basename(path, '.json');
    const snapshot = await readJson(path);
    const ctx = { name, now, bytes: (await stat(path)).size };
    const problems = RULES.flatMap((rule) => rule(snapshot, ctx));
    report.push({ name, problems });
  }
  return report;
}

export async function run({ flags }, { log }) {
  const dir = flags.data ?? join(ROOT, 'data');
  const now = flags.now ? Date.parse(flags.now) : Date.now();
  const report = await verifyDir(dir, { now });
  for (const { name, problems } of report) {
    if (problems.length === 0) log.ok(name);
    for (const p of problems) log.fail(`${name}: ${p}`);
  }
  return report.some((r) => r.problems.length > 0) ? 1 : 0;
}
