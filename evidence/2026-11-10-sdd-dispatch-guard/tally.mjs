#!/usr/bin/env node
// tally.mjs <treatment|fork> --out <dir> <run-workspace>...: the dispatch
// guard scenario's measures (spec "Pairing rule" and "Scenario"; plan Task 8),
// read from each run's workspace: the guard's log and the stop guard's mirror
// anywhere under home/ (hyperpowers/dispatch-guard/<sid>.jsonl and
// hyperpowers/stop-guard/<sid>.jsonl), and each session's main transcript
// under home/.claude/projects. Workspaces are given in launch order, in the
// archive's layout (<arm>/workspaces/<run> beside <arm>/<run>/verdict.json).
// A run whose verdict shows the Gauntlet never produced a run (a setup or
// transport void) is an instrument failure: it is listed but is not a trial,
// so it neither counts nor uses up a void replacement.
import { mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const readJsonl = (p) => readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => { try { const r = JSON.parse(l); return r && typeof r === 'object' && !Array.isArray(r) ? [r] : []; } catch { return []; } });
function findFiles(root, test, depth = 8) {
  const out = [];
  const walk = (d, left) => {
    let names; try { names = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const n of names) {
      const p = join(d, n.name);
      if (n.isDirectory()) { if (left > 0) walk(p, left - 1); } else if (n.isFile() && test(p)) out.push(p);
    }
  };
  walk(root, depth);
  return out.sort();
}
const textOf = (b) => (typeof b?.content === 'string' ? b.content : Array.isArray(b?.content) ? b.content.map((c) => c?.text || '').join('\n') : '');
const isForeground = (input) => input?.run_in_background === false || input?.run_in_background === 'false';
const DISPATCH = new Set(['Agent', 'SendMessage']);

// evals/evidence/README.md's two void shapes: a setup void has `gauntlet`
// null, a transport void has `gauntlet.run_id` null. A run with no verdict
// beside it (the Zed copy, or a hand-built workspace) is a trial.
export function instrumentFailure(ws) {
  let v;
  try { v = JSON.parse(readFileSync(join(dirname(dirname(ws)), basename(ws), 'verdict.json'), 'utf8')); } catch { return false; }
  return v?.gauntlet == null || v.gauntlet.run_id == null;
}

export function loadRun(ws) {
  const home = join(ws, 'home');
  const guardLogs = findFiles(home, (p) => /\/hyperpowers\/dispatch-guard\/[^/]+\.jsonl$/.test(p));
  const stopLogs = findFiles(home, (p) => /\/hyperpowers\/stop-guard\/[^/]+\.jsonl$/.test(p));
  return guardLogs.map((g) => {
    const sid = basename(g, '.jsonl');
    const transcript = findFiles(join(home, '.claude', 'projects'), (p) => basename(p) === `${sid}.jsonl`)[0];
    const stop = stopLogs.find((p) => basename(p, '.jsonl') === sid);
    return { sid, guard: readJsonl(g), stop: stop ? readJsonl(stop) : [], records: transcript ? readJsonl(transcript).filter((r) => !r.isSidechain) : [] };
  });
}

// The pairing rule. A turn end is a stop-guard allow line; a block line is a
// turn the guard kept open.
export function scoreSession({ guard, stop, records }) {
  const turnEnds = stop.filter((l) => l.decision === 'allow' && typeof l.ts === 'string').map((l) => l.ts).sort();
  const liveAgent = stop.filter((l) => l.reason === 'live-agent').length;
  const refusals = guard.filter((l) => l.decision === 'deny').map((d) => {
    const ri = records.findIndex((r) => r.type === 'user' && Array.isArray(r.message?.content) && r.message.content.some((b) => b?.type === 'tool_result' && b.tool_use_id === d.tool_use_id));
    if (ri === -1) return { reason: d.reason, tool_use_id: d.tool_use_id, matched: false, paired: false, text: '', next: 'none' };
    const block = records[ri].message.content.find((b) => b?.type === 'tool_result' && b.tool_use_id === d.tool_use_id);
    const resultTs = records[ri].timestamp;
    let next = null;
    for (let i = ri + 1; i < records.length && !next; i++) {
      if (records[i].type !== 'assistant') continue;
      const b = (records[i].message?.content || []).find((x) => x?.type === 'tool_use' && DISPATCH.has(x.name));
      if (b) next = { name: b.name, input: b.input || {}, ts: records[i].timestamp };
    }
    const stopTs = turnEnds.find((t) => t > resultTs) || null;
    const paired = !!next && next.name === 'Agent' && isForeground(next.input) && (!stopTs || next.ts < stopTs);
    return { reason: d.reason, tool_use_id: d.tool_use_id, matched: true, paired, text: textOf(block), next: next ? `${next.name}:${JSON.stringify(next.input.run_in_background ?? null)}` : 'none' };
  });
  const agentCalls = records.filter((r) => r.type === 'assistant').flatMap((r) => (r.message?.content || []).filter((b) => b?.type === 'tool_use' && b.name === 'Agent'));
  return { refusals, liveAgent, guard, agentCalls };
}

export function classifyRun(scores) {
  const refusals = scores.flatMap((s) => s.refusals);
  const srm = refusals.filter((r) => r.matched && r.reason === 'sendmessage-resume');
  const bg = refusals.filter((r) => r.matched && r.reason === 'background-agent');
  const paired = refusals.filter((r) => r.paired).length;
  const liveAgent = scores.reduce((n, s) => n + s.liveAgent, 0);
  const row = { srm: srm.length, bg: bg.length, paired, unpaired: refusals.length - paired, liveAgent, refusals };
  if (srm.length === 0) return { status: 'void', ...row };
  return { status: 'counted', pass: refusals.every((r) => r.paired) && liveAgent === 0, bgPaired: bg.some((r) => r.paired), ...row };
}

// The first five counted runs are scored. Voids are counted over the whole
// launch sequence, as the spec states it: a fourth void fails the scenario
// wherever it falls. An instrument failure is skipped.
export function verdict(runs) {
  let voids = 0; const counted = [];
  for (const r of runs) {
    if (r.status === 'instrument') continue;
    if (r.status === 'void') { voids++; continue; }
    if (counted.length < 5) counted.push(r);
  }
  if (voids >= 4) return 'FAIL';
  if (counted.some((r) => !r.pass)) return 'FAIL';
  if (counted.length < 5) return 'INCOMPLETE';
  return counted.some((r) => r.bgPaired) ? 'PASS' : 'FAIL';
}

const cell = (v) => String(v ?? '').replace(/[\t\n\r]/g, ' ');
const tsv = (cols, rows) => [cols.join('\t'), ...rows.map((r) => r.map(cell).join('\t'))].join('\n') + '\n';

export async function main(argv) {
  const [arm, flag, out, ...workspaces] = argv;
  // zed scores the one manual Zed run (plan Task 10): it passes when that run
  // is counted and passing, with no five-run rule.
  const usage = !['treatment', 'fork', 'zed'].includes(arm) || flag !== '--out' || !out || !workspaces.length || (arm === 'zed' && workspaces.length !== 1);
  if (usage) { console.error('usage: tally.mjs <treatment|fork> --out <dir> <workspace>... | tally.mjs zed --out <dir> <workspace>'); return 'USAGE'; }
  mkdirSync(out, { recursive: true });
  const runs = workspaces.map((ws) => ({ name: basename(ws), instrument: instrumentFailure(ws), scores: loadRun(ws).map(scoreSession) }));
  let v;
  if (arm === 'treatment' || arm === 'zed') {
    const classified = runs.map((r) => ({ name: r.name, ...classifyRun(r.scores), ...(r.instrument ? { status: 'instrument' } : {}) }));
    const scored = (c) => c.status === 'counted';
    writeFileSync(join(out, `tally-${arm}.tsv`), tsv(['run', 'status', 'pass', 'srm_refusals', 'bg_refusals', 'paired', 'unpaired', 'live_agent', 'bg_paired'],
      classified.map((c) => [c.name, c.status, scored(c) ? (c.pass ? 'yes' : 'no') : '', c.srm, c.bg, c.paired, c.unpaired, c.liveAgent, scored(c) ? (c.bgPaired ? 'yes' : 'no') : ''])));
    writeFileSync(join(out, 'denied-results.tsv'), tsv(['run', 'reason', 'tool_use_id', 'paired', 'next', 'text'],
      classified.flatMap((c) => c.refusals.map((r) => [c.name, r.reason, r.tool_use_id, r.paired ? 'yes' : 'no', r.next, r.text.slice(0, 2000)]))));
    v = arm === 'zed' ? (scored(classified[0]) && classified[0].pass ? 'PASS' : 'FAIL') : verdict(classified);
    const n = (s) => classified.filter((c) => c.status === s).length;
    console.log(`verdict=${v} counted=${n('counted')} voids=${n('void')} instrument=${n('instrument')}`);
  } else {
    const rows = runs.filter((r) => !r.instrument).map((r) => {
      const guard = r.scores.flatMap((s) => s.guard);
      const calls = r.scores.flatMap((s) => s.agentCalls);
      const keyed = calls.filter((b) => b.input && Object.hasOwn(b.input, 'run_in_background'));
      return [r.name, guard.filter((l) => l.decision === 'deny').length, guard.filter((l) => l.reason === 'fork-mode').length, calls.length, keyed.length, [...new Set(keyed.map((b) => JSON.stringify(b.input.run_in_background)))].join(',')];
    });
    writeFileSync(join(out, 'tally-fork.tsv'), tsv(['run', 'denies', 'fork_mode', 'agent_calls', 'key_passed', 'key_values'], rows));
    v = rows.length > 0 && rows.every((r) => r[1] === 0 && r[2] >= 1) ? 'PASS' : 'FAIL';
    console.log(`verdict=${v} runs=${rows.length}`);
  }
  return v;
}

let mainPath = process.argv[1] || '';
try { if (mainPath) mainPath = realpathSync(mainPath); } catch { /* compare the raw path */ }
if (mainPath && import.meta.url === pathToFileURL(mainPath).href) {
  const v = await main(process.argv.slice(2));
  process.exitCode = v === 'PASS' ? 0 : v === 'USAGE' ? 2 : 1;
}
