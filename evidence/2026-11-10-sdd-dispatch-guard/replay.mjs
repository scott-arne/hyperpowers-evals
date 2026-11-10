#!/usr/bin/env node
// replay.mjs: the dispatch guard's field replay (spec "Field replay", plan
// Task 5). Every main-chain Agent and SendMessage call in the frozen corpus
// runs through the guard's own screen and decideDispatch, with discovery
// forced to a ledger and the transcript facts read from the transcript up to
// that call under the guard's 16 MB cap. The counts and sha256 prefixes in the
// manifest are recomputed first, by field/manifest.py's rules; any
// disagreement stops the replay before a call is decided.
//
// node replay.mjs --module <hp root>/hooks/lib/dispatch-guard.mjs \
//   --manifest field/manifest.tsv --projects ~/.claude/projects --out <dir>
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CUTOFF = '2026-11-10T18:10:00Z';
export const WINDOW_START = '2026-11-06T21:00:00Z';
export const TAIL_CAP = 16 * 1024 * 1024;
const SDD_SKILL = /subagent-driven-development/;
const SDD_CMD = /\b(sdd-state|sdd-dir)\b/;
const FINISH = /\bsdd-state\b[^;&|\n]*\bfinish\b/;

export function parseManifest(text) {
  return text.split('\n').filter((l) => l.trim()).map((l) => {
    const [projectDir, session, agent, send, sha] = l.split('\t');
    return { projectDir, session, agent: Number(agent), send: Number(send), sha };
  });
}

const textOf = (rec) => { const c = rec?.message?.content; if (typeof c === 'string') return c; if (Array.isArray(c)) return c.filter((b) => b?.type === 'text').map((b) => b.text || '').join('\n'); return ''; };

// One pass, as manifest.py reads a transcript: lines split on 0x0a with the
// newline kept; a line that does not parse is skipped and not hashed; the
// scan stops at the first record stamped after the cutoff. `all` keeps every
// line's offsets, parseable or not, because the live reader's cap counts
// every byte.
// `trace`, when given, receives one entry per hashed line (running counts,
// hash and malformed total) so freeze.mjs can find where a row's state holds.
export function scanSession(buf, { cutoff = CUTOFF, windowStart = WINDOW_START, trace } = {}) {
  const h = createHash('sha256');
  const all = []; const calls = []; const context = [];
  let agent = 0; let send = 0; let start = 0; let malformed = 0;
  while (start < buf.length) {
    const nl = buf.indexOf(0x0a, start);
    const end = nl === -1 ? buf.length : nl + 1;
    const raw = buf.subarray(start, end);
    let rec; let parsed = true;
    try { rec = JSON.parse(raw.toString('utf8')); } catch { parsed = false; }
    if (parsed) {
      const isRecord = rec !== null && typeof rec === 'object' && !Array.isArray(rec);
      const ts = isRecord ? rec.timestamp : undefined;
      if (ts && ts > cutoff) break;
      h.update(raw);
      const index = all.length;
      all.push({ start, end });
      if (isRecord && !rec.isSidechain) {
        if (rec.isCompactSummary) context.push({ ts: ts || '', kind: 'compaction', detail: '' });
        if (rec.type === 'user' && textOf(rec).includes('subagent-driven-development</command-name>')) context.push({ ts: ts || '', kind: 'sdd-skill', detail: 'slash command' });
        if (rec.type === 'assistant') {
          for (const b of rec.message?.content || []) {
            if (b?.type !== 'tool_use') continue;
            const input = b.input && typeof b.input === 'object' ? b.input : {};
            if (b.name === 'Skill' && SDD_SKILL.test(String(input.skill || ''))) context.push({ ts: ts || '', kind: 'sdd-skill', detail: String(input.skill) });
            if (b.name === 'Bash' && typeof input.command === 'string') {
              const cmd = input.command.replace(/\\\n/g, ' ');
              if (SDD_CMD.test(cmd)) context.push({ ts: ts || '', kind: 'sdd-cmd', detail: cmd.replace(/\s+/g, ' ').slice(0, 160) });
              if (FINISH.test(cmd)) context.push({ ts: ts || '', kind: 'sdd-finish', detail: '' });
            }
            if (!ts || ts < windowStart) continue;
            if (b.name === 'Agent') agent++; else if (b.name === 'SendMessage') send++; else continue;
            calls.push({ index, ts, name: b.name, id: b.id, input });
          }
        }
      }
      if (trace) trace.push({ index, end, agent, send, sha: h.copy().digest('hex').slice(0, 12), malformed });
    } else {
      malformed++;
      all.push({ start, end });
    }
    start = end;
  }
  return { agent, send, malformed, sha: h.digest('hex').slice(0, 12), all, calls, context };
}

// The transcript up to and including the call's own line, newest first, as
// linesFromEnd yields it: whole lines while they fit under the cap, then null
// when the cap stops the read before the file's start. The live reader yields
// a line only once it has read the newline before it, so a line that fills the
// window exactly is yielded only when it starts the file.
export function* prefixLines(buf, all, index, cap = TAIL_CAP) {
  let read = 0;
  for (let i = index; i >= 0; i--) {
    const { start, end } = all[i];
    read += end - start;
    if (read > cap || (read === cap && start !== 0)) { yield null; return; }
    yield buf.subarray(start, end).toString('utf8').replace(/\n$/, '');
  }
}

const cell = (v) => String(v ?? '').replace(/[\t\n\r]/g, ' ');

export function replaySession(mod, row, buf, scan, { cap = TAIL_CAP } = {}) {
  const out = [];
  for (const c of scan.calls) {
    const base = {
      session: row.session, ts: c.ts, tool: c.name, tool_use_id: c.id,
      to: typeof c.input.to === 'string' ? c.input.to : '',
      run_in_background: JSON.stringify(c.input.run_in_background ?? null),
      description: cell(c.input.description).slice(0, 80),
    };
    const s = mod.screen({ session_id: row.session, tool_name: c.name, tool_input: c.input });
    if (s.done) { out.push({ ...base, step: s.log ? 'extractor' : 'screened', decision: 'allow', reason: s.log || 'foreground' }); continue; }
    const facts = mod.transcriptFacts(prefixLines(buf, scan.all, c.index, cap));
    const d = mod.decideDispatch({ tool: s.tool, toolInput: s.toolInput, discovery: { kind: 'ledger', workspace: 'replay', ledger: 'replay' }, plan: { plan: 'replay' }, facts });
    out.push({ ...base, step: 'decided', decision: d.decision, reason: d.reason });
  }
  return out;
}

const tsv = (cols, rows) => [cols.join('\t'), ...rows.map((r) => cols.map((c) => cell(r[c])).join('\t'))].join('\n') + '\n';

// A session is usable only when its recomputed state is the manifest row's and
// every line it read parses, so every byte a decision can read was hashed.
const problemOf = (row, s) => {
  if (s.agent !== row.agent || s.send !== row.send || s.sha !== row.sha) return `${row.session}: manifest ${row.agent}/${row.send}/${row.sha}, recomputed ${s.agent}/${s.send}/${s.sha}`;
  if (s.malformed > 0) return `${row.session}: ${s.malformed} unparseable line(s) before the stop point`;
  return null;
};

export async function main(argv, { readFile = readFileSync } = {}) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[String(argv[i]).replace(/^--/, '')] = argv[i + 1];
  for (const k of ['module', 'manifest', 'projects', 'out']) if (!args[k]) { console.error(`replay: missing --${k}`); return 2; }
  const mod = await import(pathToFileURL(realpathSync(args.module)).href);
  const rows = parseManifest(readFile(args.manifest, 'utf8'));
  const pathOf = (row) => join(args.projects, row.projectDir, `${row.session}.jsonl`);
  // Pass 1 verifies the whole corpus, holding one transcript at a time.
  const problems = [];
  for (const row of rows) {
    let buf; try { buf = readFile(pathOf(row)); } catch (err) { problems.push(`${row.session}: unreadable (${err.code})`); continue; }
    const p = problemOf(row, scanSession(buf));
    if (p) problems.push(p);
  }
  if (problems.length) { for (const p of problems) console.error(`replay: manifest mismatch: ${p}`); return 1; }
  // Pass 2 reads each transcript again, so it re-verifies the buffer it
  // decides from; a file that changed between passes stops the replay.
  const calls = []; const context = [];
  for (const row of rows) {
    let buf; try { buf = readFile(pathOf(row)); } catch (err) { console.error(`replay: ${row.session}: unreadable in pass 2 (${err.code})`); return 1; }
    const s = scanSession(buf);
    const p = problemOf(row, s);
    if (p) { console.error(`replay: changed between passes: ${p}`); return 1; }
    calls.push(...replaySession(mod, row, buf, s));
    context.push(...s.context.map((c) => ({ session: row.session, ...c })));
  }
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'calls.tsv'), tsv(['session', 'ts', 'tool', 'tool_use_id', 'step', 'decision', 'reason', 'to', 'run_in_background', 'description'], calls));
  const denies = calls.filter((c) => c.decision === 'deny');
  writeFileSync(join(args.out, 'refusals.tsv'), tsv(['session', 'ts', 'tool', 'tool_use_id', 'reason', 'to', 'description', 'class', 'evidence'], denies.map((c) => ({ ...c, class: '', evidence: '' }))));
  writeFileSync(join(args.out, 'context.tsv'), tsv(['session', 'ts', 'kind', 'detail'], context));
  const byReason = {};
  for (const c of calls) byReason[c.reason] = (byReason[c.reason] || 0) + 1;
  const agentN = calls.filter((c) => c.tool === 'Agent').length;
  const summary = [`calls ${calls.length} (agent ${agentN}, sendmessage ${calls.length - agentN})`, `refusals ${denies.length}`, ...Object.keys(byReason).sort().map((k) => `reason ${k} ${byReason[k]}`)];
  writeFileSync(join(args.out, 'summary.txt'), summary.join('\n') + '\n');
  console.log(summary.join('\n'));
  return 0;
}

let mainPath = process.argv[1] || '';
try { if (mainPath) mainPath = realpathSync(mainPath); } catch { /* compare the raw path */ }
if (mainPath && import.meta.url === pathToFileURL(mainPath).href) process.exitCode = await main(process.argv.slice(2));
