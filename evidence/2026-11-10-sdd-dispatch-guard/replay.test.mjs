// Run: HP_MODULE=<hp root>/hooks/lib/dispatch-guard.mjs node --test replay.test.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { CUTOFF, main, parseManifest, prefixLines, replaySession, scanSession } from './replay.mjs';

if (!process.env.HP_MODULE) throw new Error('set HP_MODULE to hooks/lib/dispatch-guard.mjs in an hp checkout');
const mod = await import(pathToFileURL(process.env.HP_MODULE).href);

const call = (ts, id, name, input, extra = {}) => ({ type: 'assistant', timestamp: ts, isSidechain: false, message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] }, ...extra });
const result = (ts, id, toolUseResult) => ({ type: 'user', timestamp: ts, isSidechain: false, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text: 'ok' }] }] }, toolUseResult });
const SYNC = (agentId) => ({ status: 'completed', agentId });
const BG = { description: 'Review Task 1', prompt: 'review', run_in_background: true };
// In the window, before the cutoff.
const T = (m) => `2026-11-08T10:${String(m).padStart(2, '0')}:00.000Z`;
const session = () => [
  call(T(0), 'tu0', 'Skill', { skill: 'hyperpowers:subagent-driven-development' }),
  call(T(1), 'tu1', 'Agent', { description: 'Implement Task 1', prompt: 'brief', run_in_background: false }),
  result(T(2), 'tu1', SYNC('a1')),
  call(T(3), 'tu2', 'Agent', BG),
  call(T(4), 'tu3', 'SendMessage', { to: 'a1', message: 'fix' }),
  call(T(5), 'tu4', 'Agent', { prompt: 'You write implementation notes for a list of design decisions. You do not judge.', run_in_background: true }),
  call(T(6), 'tu5', 'Agent', { prompt: 'p', run_in_background: false }, { isSidechain: true }),
];
const toBuf = (lines) => Buffer.from(lines.join('\n') + '\n');
const expectedSha = (rawLines) => { const h = createHash('sha256'); for (const l of rawLines) h.update(l + '\n'); return h.digest('hex').slice(0, 12); };

test('parseManifest reads the five tab-separated columns', () => {
  assert.deepEqual(parseManifest('dir\tsid\t3\t1\tabcdef012345\n\n'), [{ projectDir: 'dir', session: 'sid', agent: 3, send: 1, sha: 'abcdef012345' }]);
});
test('scanSession hashes the parseable lines up to the cutoff and counts main-chain calls in the window', () => {
  const early = JSON.stringify(call('2026-11-05T00:00:00.000Z', 'tz', 'Agent', BG));
  const recs = session().map((r) => JSON.stringify(r));
  const after = JSON.stringify(call('2026-11-10T18:10:01.000Z', 'ty', 'Agent', BG));
  const lines = [early, 'not json', ...recs, after, JSON.stringify(call(T(9), 'tx', 'Agent', BG))];
  const s = scanSession(toBuf(lines));
  assert.equal(s.agent, 3); assert.equal(s.send, 1);
  assert.equal(s.sha, expectedSha([early, ...recs]));
  assert.deepEqual(s.calls.map((c) => c.id), ['tu1', 'tu2', 'tu3', 'tu4']);
});
test('prefixLines yields the call line and earlier lines newest first, then null at the cap', () => {
  const lines = ['{"a":1}', '{"b":22}', '{"c":333}'];
  const buf = toBuf(lines); const s = scanSession(buf);
  assert.deepEqual([...prefixLines(buf, s.all, 2, 1000)], ['{"c":333}', '{"b":22}', '{"a":1}']);
  assert.deepEqual([...prefixLines(buf, s.all, 2, 20)], ['{"c":333}', '{"b":22}', null]);
});
test('replaySession decides each call from the transcript before it', () => {
  const buf = toBuf(session().map((r) => JSON.stringify(r)));
  const s = scanSession(buf);
  const rows = replaySession(mod, { session: 'sid' }, buf, s);
  assert.deepEqual(rows.map((r) => [r.tool_use_id, r.step, r.decision, r.reason]), [
    ['tu1', 'screened', 'allow', 'foreground'],
    ['tu2', 'decided', 'deny', 'background-agent'],
    ['tu3', 'decided', 'deny', 'sendmessage-resume'],
    ['tu4', 'extractor', 'allow', 'extractor'],
  ]);
});
test('a synchronous result after a call does not refuse it', () => {
  const recs = [call(T(1), 'tu2', 'Agent', BG), call(T(2), 'tu1', 'Agent', { prompt: 'p', run_in_background: false }), result(T(3), 'tu1', SYNC('a1'))];
  const buf = toBuf(recs.map((r) => JSON.stringify(r)));
  const rows = replaySession(mod, { session: 'sid' }, buf, scanSession(buf));
  assert.equal(rows[0].reason, 'fork-mode');
});
test('scanSession lists the context a hand classification needs', () => {
  const recs = [...session(), call(T(7), 'tu6', 'Bash', { command: 'bash scripts/sdd-state finish docs/plan.md --session sid' }), { type: 'user', timestamp: T(8), isSidechain: false, isCompactSummary: true, message: { role: 'user', content: 'summary' } }];
  const s = scanSession(toBuf(recs.map((r) => JSON.stringify(r))));
  assert.deepEqual(s.context.map((c) => [c.ts, c.kind]), [[T(0), 'sdd-skill'], [T(7), 'sdd-cmd'], [T(7), 'sdd-finish'], [T(8), 'compaction']]);
});
test('main stops on a manifest mismatch and writes nothing; on a match it writes the four files', async () => {
  const root = mkdtempSync(join(tmpdir(), 'replay-'));
  const projects = join(root, 'projects'); mkdirSync(join(projects, 'dir'), { recursive: true });
  const lines = session().map((r) => JSON.stringify(r));
  writeFileSync(join(projects, 'dir', 'sid.jsonl'), lines.join('\n') + '\n');
  const bad = join(root, 'bad.tsv'); writeFileSync(bad, 'dir\tsid\t9\t1\t000000000000\n');
  const outBad = join(root, 'out-bad');
  assert.equal(await main(['--module', process.env.HP_MODULE, '--manifest', bad, '--projects', projects, '--out', outBad]), 1);
  assert.equal(existsSync(outBad), false);
  const good = join(root, 'good.tsv'); writeFileSync(good, `dir\tsid\t3\t1\t${expectedSha(lines)}\n`);
  const out = join(root, 'out');
  assert.equal(await main(['--module', process.env.HP_MODULE, '--manifest', good, '--projects', projects, '--out', out]), 0);
  const refusals = readFileSync(join(out, 'refusals.tsv'), 'utf8').trim().split('\n');
  assert.equal(refusals[0], 'session\tts\ttool\ttool_use_id\treason\tto\tdescription\tclass\tevidence');
  assert.equal(refusals.length, 3);
  for (const f of ['calls.tsv', 'context.tsv', 'summary.txt']) assert.ok(existsSync(join(out, f)));
  assert.match(readFileSync(join(out, 'summary.txt'), 'utf8'), /^calls 4 \(agent 3, sendmessage 1\)$/m);
});
test('the cutoff is the spec\'s', () => { assert.equal(CUTOFF, '2026-11-10T18:10:00Z'); });
