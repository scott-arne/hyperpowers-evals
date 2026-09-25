import { expect, test } from 'bun:test';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import {
  BatchHeaderSchema,
  ResultRecordSchema,
} from '../src/contracts/batch.ts';
import {
  allocateBatchDir,
  appendResultRecord,
  makeBatchId,
  writeBatchFooter,
  writeBatchHeader,
} from '../src/run-all/batch-index.ts';
import { runGit } from '../src/setup-helpers/git.ts';

function tmpOutRoot(): string {
  return mkdtempSync(join(tmpdir(), 'runall-index-'));
}

// SUPERPOWERS_ROOT reaches the writer through env.ts -> process.env, which has
// no deleter; this file is exempted from noProcessEnv in biome.json for that.
// undefined means "unset", which is the case that must omit the fields.
function withSuperpowersRoot(root: string | undefined, body: () => void): void {
  const prev = process.env['SUPERPOWERS_ROOT'];
  if (root === undefined) {
    delete process.env['SUPERPOWERS_ROOT'];
  } else {
    process.env['SUPERPOWERS_ROOT'] = root;
  }
  try {
    body();
  } finally {
    if (prev === undefined) {
      delete process.env['SUPERPOWERS_ROOT'];
    } else {
      process.env['SUPERPOWERS_ROOT'] = prev;
    }
  }
}

// A throwaway superpowers checkout carrying the one directory the provenance
// fields answer for. gpgsign is pinned off so a signing host config cannot
// fail the fixture commit.
function tmpSuperpowersRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'sp-root-'));
  mkdirSync(join(root, 'skills', 'using-hyperpowers'), { recursive: true });
  writeFileSync(
    join(root, 'skills', 'using-hyperpowers', 'SKILL.md'),
    'boot\n',
  );
  runGit(['init', '-q', '-b', 'main'], root);
  runGit(['add', 'skills'], root);
  runGit(['-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'fixture'], root);
  return root;
}

function readHeader(batchDir: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(batchDir, 'batch.json'), 'utf8'),
  ) as Record<string, unknown>;
}

// Write a header into a fresh batch dir with SUPERPOWERS_ROOT set to `root`.
function headerWithRoot(root: string | undefined): Record<string, unknown> {
  const dir = mkdtempSync(join(tmpdir(), 'batch-'));
  withSuperpowersRoot(root, () => {
    writeBatchHeader({
      batchDir: dir,
      codingAgents: ['claude'],
      jobs: 1,
      repeat: 1,
      startedAt: '2026-09-25T00:00:00.000Z',
    });
  });
  return readHeader(dir);
}

test('makeBatchId composes the stamp and nonce', () => {
  expect(makeBatchId('20260612T015301Z', 'ab12')).toBe(
    'batch-20260612T015301Z-ab12',
  );
});

test('allocateBatchDir creates results/batches/<batch-...>', () => {
  const outRoot = tmpOutRoot();
  const batchDir = allocateBatchDir({ outRoot });
  expect(existsSync(batchDir)).toBe(true);
  expect(basename(batchDir)).toMatch(/^batch-\d{8}T\d{6}Z-[0-9a-f]{4}$/);
  expect(batchDir.startsWith(join(outRoot, 'batches'))).toBe(true);
});

test('allocateBatchDir rethrows a non-EEXIST failure instead of retrying', () => {
  const outRoot = tmpOutRoot();
  // Pre-create batches/ so the recursive mkdir of the root succeeds, then take
  // away write permission: every candidate mkdir now fails with EACCES, which
  // is not a nonce collision and must surface immediately.
  const batchesRoot = join(outRoot, 'batches');
  mkdirSync(batchesRoot);
  chmodSync(batchesRoot, 0o555);
  try {
    let thrown: unknown;
    try {
      allocateBatchDir({ outRoot });
    } catch (e) {
      thrown = e;
    }
    expect((thrown as NodeJS.ErrnoException | undefined)?.code).toBe('EACCES');
    // Not the after-100-attempts message: the loop gave up on the first error.
    expect((thrown as Error).message).not.toContain('100 attempts');
  } finally {
    chmodSync(batchesRoot, 0o755);
  }
});

test('writeBatchHeader writes batch.json with finished_at null + indent 2', () => {
  const outRoot = tmpOutRoot();
  const batchDir = allocateBatchDir({ outRoot });
  writeBatchHeader({
    batchDir,
    codingAgents: ['claude', 'codex'],
    jobs: 2,
    repeat: 1,
    startedAt: '2026-06-12T01:53:01.000Z',
  });
  const raw = readFileSync(join(batchDir, 'batch.json'), 'utf8');
  // Indent-2, no trailing newline (byte parity with the Python writer).
  expect(raw.endsWith('\n')).toBe(false);
  expect(raw).toContain('  "schema_version": 3');
  const header = BatchHeaderSchema.parse(JSON.parse(raw));
  expect(header.id).toBe(basename(batchDir));
  expect(header.finished_at).toBeNull();
  expect(header.coding_agents).toEqual(['claude', 'codex']);
  expect(header.jobs).toBe(2);
});

test('appendResultRecord writes one compact line per record, skipped omitted when null', () => {
  const outRoot = tmpOutRoot();
  const batchDir = allocateBatchDir({ outRoot });
  appendResultRecord({
    batchDir,
    scenario: 'alpha',
    codingAgent: 'claude',
    runId: 'alpha-claude-20260612T015301Z-ab12',
    skipped: null,
    trial: null,
  });
  appendResultRecord({
    batchDir,
    scenario: 'beta',
    codingAgent: 'codex',
    runId: null,
    skipped: 'directive',
    trial: null,
  });
  const lines = readFileSync(join(batchDir, 'results.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean);
  expect(lines).toHaveLength(2);
  // Python json.dumps default separators: ", " and ": ".
  expect(lines[0]).toBe(
    '{"scenario": "alpha", "coding_agent": "claude", "run_id": "alpha-claude-20260612T015301Z-ab12"}',
  );
  expect(lines[1]).toBe(
    '{"scenario": "beta", "coding_agent": "codex", "run_id": null, "skipped": "directive"}',
  );
  // The runnable record carries no `skipped` key (parsed view).
  const r0 = ResultRecordSchema.parse(JSON.parse(lines[0] ?? ''));
  expect(r0.skipped).toBeUndefined();
  const r1 = ResultRecordSchema.parse(JSON.parse(lines[1] ?? ''));
  expect(r1.skipped).toBe('directive');
});

test('writeBatchFooter sets finished_at, preserving the rest', () => {
  const outRoot = tmpOutRoot();
  const batchDir = allocateBatchDir({ outRoot });
  writeBatchHeader({
    batchDir,
    codingAgents: ['claude'],
    jobs: 1,
    repeat: 1,
    startedAt: '2026-06-12T01:53:01.000Z',
  });
  writeBatchFooter({ batchDir, finishedAt: '2026-06-12T02:00:00.000Z' });
  const header = BatchHeaderSchema.parse(
    JSON.parse(readFileSync(join(batchDir, 'batch.json'), 'utf8')),
  );
  expect(header.finished_at).toBe('2026-06-12T02:00:00.000Z');
  expect(header.started_at).toBe('2026-06-12T01:53:01.000Z');
  expect(header.coding_agents).toEqual(['claude']);
});

test('writeBatchFooter keeps a header key its own schema does not know', () => {
  const dir = mkdtempSync(join(tmpdir(), 'batch-'));
  writeBatchHeader({
    batchDir: dir,
    codingAgents: ['claude'],
    jobs: 1,
    repeat: 1,
    startedAt: '2026-06-12T01:53:01.000Z',
  });
  // Stand in for a key a newer writer added: the footer re-reads and rewrites
  // the whole file, so a strict parse here would silently drop it.
  const path = join(dir, 'batch.json');
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  raw['lens'] = 'security';
  writeFileSync(path, JSON.stringify(raw, null, 2));

  writeBatchFooter({ batchDir: dir, finishedAt: '2026-06-12T02:00:00.000Z' });

  const after = JSON.parse(readFileSync(path, 'utf8')) as Record<
    string,
    unknown
  >;
  expect(after['lens']).toBe('security');
  expect(after['finished_at']).toBe('2026-06-12T02:00:00.000Z');
});

test('appendResultRecord serializes a nested trial with the pyCompact separators', () => {
  const dir = mkdtempSync(join(tmpdir(), 'batch-'));
  appendResultRecord({
    batchDir: dir,
    scenario: 'alpha',
    codingAgent: 'claude',
    runId: 'alpha-claude-20260910T000000Z-abcd',
    skipped: null,
    trial: { index: 2, count: 3 },
  });
  const line = readFileSync(join(dir, 'results.jsonl'), 'utf8').trimEnd();
  expect(line).toBe(
    '{"scenario": "alpha", "coding_agent": "claude", ' +
      '"run_id": "alpha-claude-20260910T000000Z-abcd", ' +
      '"trial": {"index": 2, "count": 3}}',
  );
});

test('appendResultRecord omits trial when it is null', () => {
  const dir = mkdtempSync(join(tmpdir(), 'batch-'));
  appendResultRecord({
    batchDir: dir,
    scenario: 'alpha',
    codingAgent: 'claude',
    runId: null,
    skipped: 'draft',
    trial: null,
  });
  const line = readFileSync(join(dir, 'results.jsonl'), 'utf8').trimEnd();
  expect(line).toBe(
    '{"scenario": "alpha", "coding_agent": "claude", ' +
      '"run_id": null, "skipped": "draft"}',
  );
});

test('writeBatchHeader records schema_version 3 and the repeat count', () => {
  const dir = mkdtempSync(join(tmpdir(), 'batch-'));
  writeBatchHeader({
    batchDir: dir,
    codingAgents: ['claude'],
    jobs: 4,
    repeat: 3,
    startedAt: '2026-09-10T00:00:00Z',
  });
  const header = JSON.parse(
    readFileSync(join(dir, 'batch.json'), 'utf8'),
  ) as Record<string, unknown>;
  expect(header['schema_version']).toBe(3);
  expect(header['repeat']).toBe(3);
});

// Provenance of the superpowers checkout the batch ran against. The bootstrap
// text a session is injected with does not identify a commit — three heads of
// the real repository share it while carrying three different skills/ trees —
// so batch.json is the only artifact that can say which tree ran.

test('writeBatchHeader records the superpowers head, its skills tree, and a clean tree', () => {
  const root = tmpSuperpowersRoot();
  const header = headerWithRoot(root);
  expect(header['superpowers_commit']).toBe(
    runGit(['rev-parse', 'HEAD'], root).trim(),
  );
  expect(header['superpowers_commit']).toMatch(/^[0-9a-f]{40}$/);
  expect(header['superpowers_skills_tree']).toBe(
    runGit(['rev-parse', 'HEAD:skills'], root).trim(),
  );
  expect(header['superpowers_dirty']).toBe(false);
});

test('writeBatchHeader flags a modified tracked file under skills/ as dirty', () => {
  const root = tmpSuperpowersRoot();
  writeFileSync(
    join(root, 'skills', 'using-hyperpowers', 'SKILL.md'),
    'edit\n',
  );
  const header = headerWithRoot(root);
  expect(header['superpowers_dirty']).toBe(true);
  // The commit is still recorded: it is what the dirt is measured against.
  expect(header['superpowers_commit']).toBe(
    runGit(['rev-parse', 'HEAD'], root).trim(),
  );
});

test('writeBatchHeader flags an untracked file under skills/ as dirty', () => {
  // The staged plugin payload is copied from the working tree, so a new
  // untracked skill file ships exactly like a modified one.
  const root = tmpSuperpowersRoot();
  writeFileSync(join(root, 'skills', 'new-skill.md'), 'new\n');
  expect(headerWithRoot(root)['superpowers_dirty']).toBe(true);
});

test('writeBatchHeader omits the provenance fields when SUPERPOWERS_ROOT is unset', () => {
  const header = headerWithRoot(undefined);
  // Omitted, not placeholdered: a batch that could not record provenance has
  // to stay distinguishable from one that recorded it and matched.
  expect('superpowers_commit' in header).toBe(false);
  expect('superpowers_skills_tree' in header).toBe(false);
  expect('superpowers_dirty' in header).toBe(false);
  expect(header['schema_version']).toBe(3);
  expect(header['repeat']).toBe(1);
});

test('writeBatchHeader omits the provenance fields when SUPERPOWERS_ROOT is not a git checkout', () => {
  const header = headerWithRoot(mkdtempSync(join(tmpdir(), 'not-git-')));
  expect('superpowers_commit' in header).toBe(false);
  expect('superpowers_skills_tree' in header).toBe(false);
  expect('superpowers_dirty' in header).toBe(false);
});

test('BatchHeaderSchema still parses a schema_version 2 header with no provenance', () => {
  // The shape the previous writer left under results/batches/. Widening the
  // writer must not stop those from being read.
  const header = BatchHeaderSchema.parse({
    schema_version: 2,
    id: 'batch-20260612T015301Z-ab12',
    started_at: '2026-06-12T01:53:01.000Z',
    finished_at: '2026-06-12T02:00:00.000Z',
    coding_agents: ['claude'],
    jobs: 1,
    repeat: 1,
  });
  expect(header.schema_version).toBe(2);
  expect(header.superpowers_commit).toBeUndefined();
  expect(header.superpowers_skills_tree).toBeUndefined();
  expect(header.superpowers_dirty).toBeUndefined();
});
