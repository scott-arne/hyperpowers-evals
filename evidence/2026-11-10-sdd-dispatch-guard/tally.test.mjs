import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
function workspace(root, name, { guard, stopLines, records, verdictJson }) {
  const ws = join(root, 'workspaces', name); const home = join(ws, 'home');
  if (verdictJson) { mkdirSync(join(root, name), { recursive: true }); writeFileSync(join(root, name, 'verdict.json'), JSON.stringify(verdictJson)); }
  mkdirSync(join(home, '.cache', 'hyperpowers', 'dispatch-guard'), { recursive: true });
  mkdirSync(join(home, '.cache', 'hyperpowers', 'stop-guard'), { recursive: true });
  mkdirSync(join(home, '.claude', 'projects', '-w'), { recursive: true });
  const jl = (xs) => xs.map((x) => JSON.stringify(x)).join('\n') + '\n';
  if (guard) writeFileSync(join(home, '.cache', 'hyperpowers', 'dispatch-guard', 's.jsonl'), jl(guard));
  writeFileSync(join(home, '.cache', 'hyperpowers', 'stop-guard', 's.jsonl'), jl(stopLines));
  writeFileSync(join(home, '.claude', 'projects', '-w', 's.jsonl'), jl(records));
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
  assert.deepEqual(rows[0], ['run', 'status', 'pass', 'srm_refusals', 'bg_refusals', 'paired', 'unpaired', 'live_agent', 'bg_paired']);
  assert.deepEqual(rows.slice(1).map((r) => [r[0], r[1], r[2]]), [['r0', 'instrument', ''], ['r1', 'void', ''], ['r2', 'counted', 'yes'], ['r3', 'counted', 'no']]);
  assert.match(readFileSync(join(out, 'denied-results.tsv'), 'utf8'), /r2\tsendmessage-resume\tx1\tyes\tAgent:false\tSDD plan plan\.md is in progress/);
});
test('main (fork): no refusal and a fork-mode line pass; key use is recorded', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tally-'));
  const recs = [use(0, 'x1', 'Agent', { prompt: 'p', run_in_background: 'true' }), use(1, 'x2', 'Agent', { prompt: 'p' })];
  const ws = workspace(root, 'f1', { guard: [{ ...deny(0, 'x1', 'fork-mode'), decision: 'allow' }], stopLines: [], records: recs });
  const out = join(root, 'out');
  assert.equal(await main(['fork', '--out', out, ws]), 'PASS');
  const rows = readFileSync(join(out, 'tally-fork.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t'));
  assert.deepEqual(rows[0], ['run', 'denies', 'fork_mode', 'agent_calls', 'key_passed', 'key_values']);
  assert.deepEqual(rows[1], ['f1', '0', '1', '2', '1', '"true"']);
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
