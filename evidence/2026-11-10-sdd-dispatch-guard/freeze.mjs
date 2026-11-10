#!/usr/bin/env node
// freeze.mjs: cuts each manifest session's transcript to the bytes the
// manifest hashed. Claude Code appends timestamp-less records (tools-used) to
// a resumed session ahead of the first post-cutoff record, which changes the
// live file's recomputed hash; the replay runs on this frozen copy instead and
// the manifest is never edited.
//
// node freeze.mjs --manifest field/manifest.tsv --projects ~/.claude/projects --out <dir>
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseManifest, scanSession } from './replay.mjs';

const COLS = ['project_dir', 'session', 'lines_kept', 'bytes_kept', 'lines_dropped', 'dropped_types', 'copy_sha256'];

// The cut is the first hashed line at which the running state equals the row;
// every later line up to the stop point must be a record with no timestamp.
export function freezeSession(row, buf) {
  const trace = []; const s = scanSession(buf, { trace });
  const cut = trace.find((t) => t.agent === row.agent && t.send === row.send && t.sha === row.sha);
  if (!cut) throw new Error(`no prefix matches manifest ${row.agent}/${row.send}/${row.sha}`);
  if (cut.malformed > 0) throw new Error(`${cut.malformed} unparseable line(s) inside the frozen prefix`);
  const dropped = [];
  for (const { start, end } of s.all.slice(cut.index + 1)) {
    let rec; try { rec = JSON.parse(buf.subarray(start, end).toString('utf8')); } catch { throw new Error('an unparseable line follows the frozen prefix'); }
    if (rec === null || typeof rec !== 'object' || Array.isArray(rec) || 'timestamp' in rec) throw new Error('a line that is not a timestamp-less record follows the frozen prefix');
    dropped.push(String(rec.type ?? ''));
  }
  return { copy: buf.subarray(0, cut.end), kept: cut.index + 1, dropped };
}

export async function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[String(argv[i]).replace(/^--/, '')] = argv[i + 1];
  for (const k of ['manifest', 'projects', 'out']) if (!args[k]) { console.error(`freeze: missing --${k}`); return 2; }
  if (existsSync(args.out)) { console.error(`freeze: ${args.out} already exists`); return 2; }
  const rows = parseManifest(readFileSync(args.manifest, 'utf8'));
  const tmp = `${args.out}.tmp-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  const report = []; const failures = [];
  for (const row of rows) {
    try {
      const { copy, kept, dropped } = freezeSession(row, readFileSync(join(args.projects, row.projectDir, `${row.session}.jsonl`)));
      const file = join(tmp, row.projectDir, `${row.session}.jsonl`);
      mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, copy);
      report.push([row.projectDir, row.session, kept, copy.length, dropped.length, dropped.join(','), createHash('sha256').update(copy).digest('hex')]);
    } catch (err) { failures.push(`${row.session}: ${err.code || err.message}`); }
  }
  if (failures.length) { rmSync(tmp, { recursive: true, force: true }); for (const f of failures) console.error(`freeze: ${f}`); return 1; }
  writeFileSync(join(tmp, 'freeze.tsv'), [COLS, ...report].map((r) => r.join('\t')).join('\n') + '\n');
  renameSync(tmp, args.out);
  console.log(`froze ${report.length} sessions into ${args.out}`);
  return 0;
}

let mainPath = process.argv[1] || '';
try { if (mainPath) mainPath = realpathSync(mainPath); } catch { /* compare the raw path */ }
if (mainPath && import.meta.url === pathToFileURL(mainPath).href) process.exitCode = await main(process.argv.slice(2));
