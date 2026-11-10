// Run: HP_MODULE=<hp root>/hooks/lib/dispatch-guard.mjs node --test freeze.test.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { main as freeze } from './freeze.mjs';
import { main as replay } from './replay.mjs';

const call = (ts, id, name, input) => ({ type: 'assistant', timestamp: ts, isSidechain: false, message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] } });
const T = (m) => `2026-11-08T10:${String(m).padStart(2, '0')}:00.000Z`;
const frozen = [call(T(1), 'a', 'Agent', { prompt: 'p', run_in_background: false }), call(T(2), 'b', 'Agent', { prompt: 'p', run_in_background: true }), call(T(3), 'c', 'SendMessage', { to: 'x', message: 'm' })].map((r) => JSON.stringify(r));
const after = JSON.stringify(call('2026-11-10T18:10:01.000Z', 'z', 'Agent', { prompt: 'p' }));
const sha12 = (ls) => { const h = createHash('sha256'); for (const l of ls) h.update(l + '\n'); return h.digest('hex').slice(0, 12); };
const setup = (lines, manifestSha = sha12(frozen)) => {
  const root = mkdtempSync(join(tmpdir(), 'freeze-'));
  const projects = join(root, 'projects'); mkdirSync(join(projects, 'dir'), { recursive: true });
  writeFileSync(join(projects, 'dir', 'sid.jsonl'), lines.join('\n') + '\n');
  const manifest = join(root, 'm.tsv'); writeFileSync(manifest, `dir\tsid\t2\t1\t${manifestSha}\n`);
  return { root, projects, manifest, out: join(root, 'out') };
};
const run = (c) => freeze(['--manifest', c.manifest, '--projects', c.projects, '--out', c.out]);

test('a timestamp-less record appended after the frozen prefix is dropped', async () => {
  const c = setup([...frozen, JSON.stringify({ type: 'tools-used', tools: [] }), after]);
  assert.equal(await run(c), 0);
  const copy = readFileSync(join(c.out, 'dir', 'sid.jsonl'));
  assert.equal(copy.toString(), frozen.join('\n') + '\n');
  const rows = readFileSync(join(c.out, 'freeze.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t'));
  assert.deepEqual(rows[0], ['project_dir', 'session', 'lines_kept', 'bytes_kept', 'lines_dropped', 'dropped_types', 'copy_sha256']);
  assert.deepEqual(rows[1], ['dir', 'sid', '3', String(copy.length), '1', 'tools-used', createHash('sha256').update(copy).digest('hex')]);
  assert.equal(await replay(['--module', process.env.HP_MODULE, '--manifest', c.manifest, '--projects', c.out, '--out', join(c.root, 'rout')]), 0);
});
test('an unchanged transcript is cut at its stop point with nothing dropped', async () => {
  const c = setup([...frozen, after]);
  assert.equal(await run(c), 0);
  assert.equal(readFileSync(join(c.out, 'dir', 'sid.jsonl'), 'utf8'), frozen.join('\n') + '\n');
  assert.deepEqual(readFileSync(join(c.out, 'freeze.tsv'), 'utf8').trim().split('\n')[1].split('\t').slice(4, 6), ['0', '']);
});
test('a row whose hash matches no prefix fails and leaves no output', async () => {
  const c = setup([...frozen, after], '000000000000');
  assert.equal(await run(c), 1);
  assert.equal(existsSync(c.out), false);
});
test('a dropped line that carries a timestamp fails', async () => {
  const c = setup([...frozen, JSON.stringify({ type: 'user', timestamp: T(9) }), after]);
  assert.equal(await run(c), 1);
  assert.equal(existsSync(c.out), false);
});
test('an existing --out is a usage error', async () => {
  const c = setup([...frozen, after]); mkdirSync(c.out);
  assert.equal(await run(c), 2);
});
