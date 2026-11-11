import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { main, scoreSession, verdict } from './tally.mjs';

const T = (s) => new Date(Date.parse('2026-11-11T10:00:00.000Z') + s * 1000).toISOString();
const use = (t, id, name, input) => ({ type: 'assistant', timestamp: T(t), isSidechain: false, message: { content: [{ type: 'tool_use', id, name, input }] } });
const denied = (t, id, text) => ({ type: 'user', timestamp: T(t), isSidechain: false, message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: true, content: text }] } });
const deny = (t, id, reason) => ({ ts: T(t), session: 's', tool: reason === 'background-agent' ? 'Agent' : 'SendMessage', tool_use_id: id, decision: 'deny', reason, plan: 'plan.md', elapsed_ms: 1 });
const stop = (t, decision = 'allow', reason = 'open-tasks') => ({ ts: T(t), session: 's', decision, reason });
const FG = { prompt: 'p', run_in_background: false };

test('a refusal followed by a foreground Agent call before the next turn end is paired', () => {
  const s = scoreSession({ guard: [deny(1, 'x1', 'sendmessage-resume')], stop: [stop(9)], records: [use(0, 'x1', 'SendMessage', { to: 'a1' }), denied(1, 'x1', 'SDD plan plan.md is in progress'), use(2, 'x2', 'Agent', FG)] });
  assert.equal(s.refusals.length, 1); assert.equal(s.refusals[0].paired, true); assert.equal(s.refusals[0].text, 'SDD plan plan.md is in progress');
});
test('a block line is not a turn end', () => {
  const s = scoreSession({ guard: [deny(1, 'x1', 'sendmessage-resume')], stop: [stop(2, 'block')], records: [use(0, 'x1', 'SendMessage', { to: 'a1' }), denied(1, 'x1', 't'), use(3, 'x2', 'Agent', FG)] });
  assert.equal(s.refusals[0].paired, true);
});
test('a turn end before the next dispatch, a background re-dispatch, or a second SendMessage is not paired', () => {
  const base = [use(0, 'x1', 'SendMessage', { to: 'a1' }), denied(1, 'x1', 't')];
  assert.equal(scoreSession({ guard: [deny(1, 'x1', 'sendmessage-resume')], stop: [stop(2)], records: [...base, use(3, 'x2', 'Agent', FG)] }).refusals[0].paired, false);
  assert.equal(scoreSession({ guard: [deny(1, 'x1', 'sendmessage-resume')], stop: [], records: [...base, use(3, 'x2', 'Agent', { prompt: 'p', run_in_background: true })] }).refusals[0].paired, false);
  assert.equal(scoreSession({ guard: [deny(1, 'x1', 'sendmessage-resume')], stop: [], records: [...base, use(3, 'x2', 'SendMessage', { to: 'a1' })] }).refusals[0].paired, false);
  assert.equal(scoreSession({ guard: [deny(1, 'x1', 'sendmessage-resume')], stop: [], records: [...base, use(3, 'x2', 'Agent', { prompt: 'p' })] }).refusals[0].paired, false);
});
test('a deny line with no tool_result in the transcript is unmatched', () => {
  const s = scoreSession({ guard: [deny(1, 'x9', 'sendmessage-resume')], stop: [], records: [use(2, 'x2', 'Agent', FG)] });
  assert.equal(s.refusals[0].matched, false); assert.equal(s.refusals[0].paired, false);
});
test('verdict: five passing counted runs with a paired background refusal pass; a fourth void anywhere fails; only the first five counted runs are scored', () => {
  const ok = (bg = false) => ({ status: 'counted', pass: true, bgPaired: bg });
  const v = { status: 'void' };
  assert.equal(verdict([ok(true), ok(), ok(), ok(), ok()]), 'PASS');
  assert.equal(verdict([ok(), ok(), ok(), ok(), ok()]), 'FAIL');
  assert.equal(verdict([v, ok(true), v, ok(), v, ok(), ok(), ok()]), 'PASS');
  assert.equal(verdict([v, v, v, v, ok(true), ok(), ok(), ok(), ok()]), 'FAIL');
  assert.equal(verdict([ok(true), { status: 'counted', pass: false, bgPaired: false }, ok(), ok(), ok()]), 'FAIL');
  assert.equal(verdict([ok(true), ok()]), 'INCOMPLETE');
  assert.equal(verdict([ok(true), ok(), ok(), ok(), ok(), v, v, v, v]), 'FAIL');
  assert.equal(verdict([ok(true), ok(), ok(), ok(), ok(), { status: 'counted', pass: false, bgPaired: false }]), 'PASS');
  const inst = { status: 'instrument' };
  assert.equal(verdict([inst, v, inst, v, inst, v, inst, ok(true), ok(), ok(), ok(), ok()]), 'PASS');
});

// The archive's layout: <arm>/workspaces/<run> beside <arm>/<run>/verdict.json.
function workspace(root, name, { guard, stopLines, records, verdictJson, verdictRaw, guardRaw, transcriptRaw }) {
  const ws = join(root, 'workspaces', name); const home = join(ws, 'home');
  if (verdictJson) { mkdirSync(join(root, name), { recursive: true }); writeFileSync(join(root, name, 'verdict.json'), JSON.stringify(verdictJson)); }
  mkdirSync(join(home, '.cache', 'hyperpowers', 'dispatch-guard'), { recursive: true });
  mkdirSync(join(home, '.cache', 'hyperpowers', 'stop-guard'), { recursive: true });
  mkdirSync(join(home, '.claude', 'projects', '-w'), { recursive: true });
  const jl = (xs) => xs.map((x) => JSON.stringify(x)).join('\n') + '\n';
  if (guard) writeFileSync(join(home, '.cache', 'hyperpowers', 'dispatch-guard', 's.jsonl'), jl(guard));
  if (guardRaw !== undefined) writeFileSync(join(home, '.cache', 'hyperpowers', 'dispatch-guard', 's.jsonl'), guardRaw);
  if (verdictRaw !== undefined) { mkdirSync(join(root, name), { recursive: true }); writeFileSync(join(root, name, 'verdict.json'), verdictRaw); }
  if (stopLines) writeFileSync(join(home, '.cache', 'hyperpowers', 'stop-guard', 's.jsonl'), jl(stopLines));
  writeFileSync(join(home, '.claude', 'projects', '-w', 's.jsonl'), transcriptRaw ?? jl(records));
  return ws;
}
test('main (treatment): an instrument failure, a void run, a passing run, a live-agent failure; denied results captured', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const recs = [use(0, 'x1', 'SendMessage', { to: 'a1' }), denied(1, 'x1', 'SDD plan plan.md is in progress'), use(2, 'x2', 'Agent', FG)];
  const ran = { gauntlet: { run_id: 'g1', status: 'completed' }, error: null };
  const setupVoid = workspace(root, 'r0', { stopLines: [], records: [], verdictJson: { gauntlet: null, error: { stage: 'setup' } } });
  const voidRun = workspace(root, 'r1', { guard: [{ ...deny(1, 'x1', 'fork-mode'), decision: 'allow' }], stopLines: [stop(9)], records: recs, verdictJson: ran });
  const good = workspace(root, 'r2', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], records: recs, verdictJson: ran });
  const live = workspace(root, 'r3', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9, 'allow', 'live-agent')], records: recs });
  const out = join(root, 'out');
  const v = await main(['treatment', '--out', out, setupVoid, voidRun, good, live]);
  assert.equal(v, 'FAIL');
  const rows = readFileSync(join(out, 'tally-treatment.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t'));
  assert.deepEqual(rows[0], ['run', 'status', 'pass', 'srm_refusals', 'bg_refusals', 'paired', 'unpaired', 'live_agent', 'bg_paired', 'problems']);
  assert.deepEqual(rows.slice(1).map((r) => [r[0], r[1], r[2]]), [['r0', 'instrument', ''], ['r1', 'void', ''], ['r2', 'counted', 'yes'], ['r3', 'counted', 'no']]);
  assert.match(readFileSync(join(out, 'denied-results.tsv'), 'utf8'), /r2\tsendmessage-resume\tx1\tyes\tAgent:false\tSDD plan plan\.md is in progress/);
});
test('main (fork): no refusal and a fork-mode line pass; key use is recorded', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const recs = [use(0, 'x1', 'Agent', { prompt: 'p', run_in_background: 'true' }), use(1, 'x2', 'Agent', { prompt: 'p' })];
  const ws = workspace(root, 'f1', { guard: [{ ...deny(0, 'x1', 'fork-mode'), decision: 'allow' }], stopLines: [], records: recs });
  const out = join(root, 'out');
  assert.equal(await main(['fork', '--out', out, ws]), 'PASS');
  const rows = readFileSync(join(out, 'tally-fork.tsv'), 'utf8').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
  assert.deepEqual(rows[0], ['run', 'denies', 'fork_mode', 'agent_calls', 'key_passed', 'key_values', 'problems']);
  assert.deepEqual(rows[1], ['f1', '0', '1', '2', '1', '"true"', '']);
  const bad = workspace(root, 'f2', { guard: [deny(0, 'x1', 'background-agent')], stopLines: [], records: recs });
  assert.equal(await main(['fork', '--out', join(root, 'out2'), bad]), 'FAIL');
});
test('main (zed): one counted, passing run passes; a void or a failing run fails; two workspaces are a usage error', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const recs = [use(0, 'x1', 'SendMessage', { to: 'a1' }), denied(1, 'x1', 't'), use(2, 'x2', 'Agent', FG)];
  const good = workspace(root, 'z1', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], records: recs });
  assert.equal(await main(['zed', '--out', join(root, 'o1'), good]), 'PASS');
  assert.match(readFileSync(join(root, 'o1', 'tally-zed.tsv'), 'utf8'), /^z1\tcounted\tyes\t/m);
  const voidRun = workspace(root, 'z2', { guard: [], stopLines: [stop(9)], records: recs });
  assert.equal(await main(['zed', '--out', join(root, 'o2'), voidRun]), 'FAIL');
  const live = workspace(root, 'z3', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9, 'allow', 'live-agent')], records: recs });
  assert.equal(await main(['zed', '--out', join(root, 'o3'), live]), 'FAIL');
  assert.equal(await main(['zed', '--out', join(root, 'o4'), good, live]), 'USAGE');
});

// Evidence problems (F1): each of these runs would otherwise count and pass.
const SRM = [use(0, 'x1', 'SendMessage', { to: 'a1' }), denied(1, 'x1', 'SDD plan plan.md is in progress'), use(2, 'x2', 'Agent', FG)];
const jl = (xs) => xs.map((x) => JSON.stringify(x)).join('\n') + '\n';
async function tallyRow(arm, ws, root) {
  const out = join(root, `out-${Math.random().toString(36).slice(2)}`);
  const v = await main([arm, '--out', out, ws]);
  const file = arm === 'fork' ? 'tally-fork.tsv' : `tally-${arm}.tsv`;
  const rows = readFileSync(join(out, file), 'utf8').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
  return { v, header: rows[0], row: rows[1] };
}
test('evidence: a session with a guard log and no stop mirror fails the run, and the same run passes with its mirror', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const ok = await tallyRow('zed', workspace(root, 'e0', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], records: SRM }), root);
  assert.equal(ok.v, 'PASS');
  const lost = await tallyRow('zed', workspace(root, 'e1', { guard: [deny(1, 'x1', 'sendmessage-resume')], records: SRM }), root);
  assert.equal(lost.v, 'FAIL'); assert.equal(lost.row[1], 'evidence');
  assert.equal(lost.header.at(-1), 'problems'); assert.match(lost.row.at(-1), /session s .*no stop-guard mirror/);
});
test('evidence: an unparseable guard-log line, an unparseable mirror line and a mirror_failed line each fail the run', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const g = jl([deny(1, 'x1', 'sendmessage-resume')]);
  const badGuard = await tallyRow('zed', workspace(root, 'e2', { guard: [], guardRaw: g + '{torn\n', stopLines: [stop(9)], records: SRM }), root);
  assert.equal(badGuard.row[1], 'evidence'); assert.match(badGuard.row.at(-1), /dispatch-guard.*line 2/);
  const badStop = workspace(root, 'e3', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], records: SRM });
  writeFileSync(join(badStop, 'home', '.cache', 'hyperpowers', 'stop-guard', 's.jsonl'), jl([stop(9)]) + 'not json\n');
  assert.equal((await tallyRow('zed', badStop, root)).row[1], 'evidence');
  const mf = await tallyRow('zed', workspace(root, 'e4', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9), { ...stop(10), mirror_failed: true }], records: SRM }), root);
  assert.equal(mf.row[1], 'evidence'); assert.match(mf.row.at(-1), /mirror_failed/);
});
test('evidence: a missing home/ and a guard-log session with no transcript fail the run', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const ws = workspace(root, 'e5', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], records: SRM });
  rmSync(join(ws, 'home', '.claude', 'projects'), { recursive: true });
  const noTranscript = await tallyRow('zed', ws, root);
  assert.equal(noTranscript.row[1], 'evidence'); assert.match(noTranscript.row.at(-1), /transcript/);
  const gone = workspace(root, 'e6', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], records: SRM });
  rmSync(join(gone, 'home'), { recursive: true });
  const noHome = await tallyRow('zed', gone, root);
  assert.equal(noHome.row[1], 'evidence'); assert.match(noHome.row.at(-1), /home/);
});
test('evidence: an unterminated final transcript line is ignored; an unparseable interior line is a problem', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const good = jl(SRM);
  const torn = await tallyRow('zed', workspace(root, 'e7', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], transcriptRaw: good + '{"type":"assis' }), root);
  assert.equal(torn.v, 'PASS');
  const interior = await tallyRow('zed', workspace(root, 'e8', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], transcriptRaw: 'garbage\n' + good }), root);
  assert.equal(interior.row[1], 'evidence'); assert.match(interior.row.at(-1), /projects\/-w\/s\.jsonl line 1/);
  const terminated = await tallyRow('zed', workspace(root, 'e9', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], transcriptRaw: good + '{torn\n' }), root);
  assert.equal(terminated.row[1], 'evidence');
});
test('evidence: an unparseable verdict.json fails the run; a missing one stays a trial', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const bad = await tallyRow('zed', workspace(root, 'e10', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], records: SRM, verdictRaw: '{oops' }), root);
  assert.equal(bad.row[1], 'evidence'); assert.match(bad.row.at(-1), /verdict\.json/);
  assert.equal((await tallyRow('zed', workspace(root, 'e11', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [stop(9)], records: SRM }), root)).v, 'PASS');
});
test('evidence: an evidence run fails the verdict wherever it falls; the fork arm does not need a stop mirror', async () => {
  const ok = { status: 'counted', pass: true, bgPaired: true }; const ev = { status: 'evidence' };
  assert.equal(verdict([ok, ok, ok, ok, ok, ev]), 'FAIL');
  assert.equal(verdict([ev, ok, ok, ok, ok, ok]), 'FAIL');
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const recs = [use(0, 'x1', 'Agent', { prompt: 'p' })];
  const f = await tallyRow('fork', workspace(root, 'f1', { guard: [{ ...deny(0, 'x1', 'fork-mode'), decision: 'allow' }], records: recs }), root);
  assert.equal(f.v, 'PASS'); assert.equal(f.header.at(-1), 'problems'); assert.equal(f.row.at(-1), '');
  const noT = workspace(root, 'f2', { guard: [{ ...deny(0, 'x1', 'fork-mode'), decision: 'allow' }], records: recs });
  rmSync(join(noT, 'home', '.claude', 'projects'), { recursive: true });
  assert.equal((await tallyRow('fork', noT, root)).v, 'FAIL');
});
test('a matched result without is_error is not a denial and is never paired', () => {
  const plain = { type: 'user', timestamp: T(1), isSidechain: false, message: { content: [{ type: 'tool_result', tool_use_id: 'x1', content: 'ran normally' }] } };
  const s = scoreSession({ guard: [deny(1, 'x1', 'sendmessage-resume')], stop: [stop(9)], records: [use(0, 'x1', 'SendMessage', { to: 'a1' }), plain, use(2, 'x2', 'Agent', FG)] });
  assert.equal(s.refusals[0].matched, true); assert.equal(s.refusals[0].denied, false); assert.equal(s.refusals[0].paired, false);
});
test('a log-failed allow that displaces a live-agent reason counts as a live agent', async () => {
  const lf = (detail) => ({ ...stop(9, 'allow', 'log-failed'), detail });
  const live = (n) => scoreSession({ guard: [], stop: [lf(n)], records: [] }).liveAgent;
  assert.equal(live('live-agent'), 1); assert.equal(live('live-agent: 2 background agents'), 1);
  assert.equal(live('open-tasks'), 0); assert.equal(live('live-agentish'), 0);
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const r = await tallyRow('zed', workspace(root, 'l1', { guard: [deny(1, 'x1', 'sendmessage-resume')], stopLines: [lf('live-agent')], records: SRM }), root);
  assert.equal(r.v, 'FAIL'); assert.equal(r.row[1], 'counted'); assert.equal(r.row[2], 'no');
});
