import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(import.meta.dir, '..', 'src', 'cli', 'index.ts');
const MOCK = resolve(import.meta.dir, 'mock-gauntlet');
// The REAL coding-agents/ dir: the runner now requires claude-context/ +
// claude.project-prompt.md for a claude run, and both live here (a synthetic
// fixture would lack them). Its session_log_dir is the same
// ${CLAUDE_CONFIG_DIR}/projects the mock-gauntlet seeds.
const REAL_CODING_AGENTS = resolve(import.meta.dir, '..', 'coding-agents');

function scenario(): string {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  writeFileSync(
    join(scn, 'story.md'),
    '---\nquorum_max_time: 1m\n---\nDo the thing.',
  );
  writeFileSync(join(scn, 'setup.sh'), '#!/usr/bin/env bash\n:\n');
  chmodSync(join(scn, 'setup.sh'), 0o755);
  writeFileSync(join(scn, 'checks.sh'), 'pre() { :; }\npost() { :; }\n');
  return scn;
}

function runCli(
  fixture: string,
  extraArgs: readonly string[] = [],
): { status: number | null; stdout: string; stderr: string } {
  const proc = spawnSync(
    'bun',
    [
      CLI,
      'run',
      scenario(),
      '--coding-agent',
      'claude',
      '--coding-agents-dir',
      REAL_CODING_AGENTS,
      '--out-root',
      mkdtempSync(join(tmpdir(), 'out-')),
      ...extraArgs,
    ],
    {
      env: {
        ...process.env,
        PATH: `${MOCK}:${process.env['PATH'] ?? ''}`,
        ANTHROPIC_API_KEY: 'sk-test',
        // The real claude.yaml lists SUPERPOWERS_ROOT in required_env and the
        // $SUPERPOWERS_ROOT context substitution reads it.
        SUPERPOWERS_ROOT: mkdtempSync(join(tmpdir(), 'sproot-')),
        MOCK_GAUNTLET_FIXTURE: fixture,
      },
      encoding: 'utf8',
    },
  );
  return { status: proc.status, stdout: proc.stdout, stderr: proc.stderr };
}

test('quorum run exits 1 on a fail verdict and prints run-id', () => {
  const { status, stdout } = runCli('fail-no-usage');
  expect(stdout).toContain('run-id:');
  expect(status).toBe(1);
});

test('quorum run exits 0 on a pass verdict', () => {
  const { status, stdout } = runCli('pass');
  expect(stdout).toContain('run-id:');
  expect(status).toBe(0);
});

test('quorum run --repeat 3 prints three run-ids and a trial vector', () => {
  const { status, stdout } = runCli('fail-no-usage', ['--repeat', '3']);
  const runIds = stdout
    .split('\n')
    .filter((l) => l.startsWith('run-id: '))
    .map((l) => l.slice('run-id: '.length));
  expect(runIds).toHaveLength(3);
  expect(new Set(runIds).size).toBe(3);
  expect(stdout).toContain('trials: FFF');
  expect(status).toBe(1);
});

test('quorum run --repeat 3 on a passing scenario exits 0', () => {
  const { status, stdout } = runCli('pass', ['--repeat', '3']);
  expect(stdout).toContain('trials: PPP');
  expect(status).toBe(0);
});

test('quorum run without --repeat prints no trial vector', () => {
  const { stdout, status } = runCli('fail-no-usage');
  expect(stdout).not.toContain('trials:');
  expect(status).toBe(1);
});

test('quorum run --repeat 1 adds the vector line and stamps the trial', () => {
  const outRoot = mkdtempSync(join(tmpdir(), 'out-'));
  const proc = spawnSync(
    'bun',
    [
      CLI,
      'run',
      scenario(),
      '--coding-agent',
      'claude',
      '--coding-agents-dir',
      REAL_CODING_AGENTS,
      '--out-root',
      outRoot,
      '--repeat',
      '1',
    ],
    {
      env: {
        ...process.env,
        PATH: `${MOCK}:${process.env['PATH'] ?? ''}`,
        ANTHROPIC_API_KEY: 'sk-test',
        SUPERPOWERS_ROOT: mkdtempSync(join(tmpdir(), 'sproot-')),
        MOCK_GAUNTLET_FIXTURE: 'fail-no-usage',
      },
      encoding: 'utf8',
    },
  );
  const runIds = (proc.stdout ?? '')
    .split('\n')
    .filter((l) => l.startsWith('run-id: '))
    .map((l) => l.slice('run-id: '.length));
  expect(runIds).toHaveLength(1);
  expect(proc.stdout).toContain('trials: F');
  expect(proc.status).toBe(1);
  // The distinction the option source exists for: an explicit `--repeat 1`
  // stamps the trial, an omitted flag does not. A test that only checked the
  // value would pass against the broken `opts.repeat !== '1'` guard.
  const v = JSON.parse(
    readFileSync(join(outRoot, runIds[0] as string, 'verdict.json'), 'utf8'),
  ) as { trial?: { index: number; count: number } };
  expect(v.trial).toEqual({ index: 1, count: 1 });
});

test('quorum run without --repeat writes no trial field', () => {
  const outRoot = mkdtempSync(join(tmpdir(), 'out-'));
  const proc = spawnSync(
    'bun',
    [
      CLI,
      'run',
      scenario(),
      '--coding-agent',
      'claude',
      '--coding-agents-dir',
      REAL_CODING_AGENTS,
      '--out-root',
      outRoot,
    ],
    {
      env: {
        ...process.env,
        PATH: `${MOCK}:${process.env['PATH'] ?? ''}`,
        ANTHROPIC_API_KEY: 'sk-test',
        SUPERPOWERS_ROOT: mkdtempSync(join(tmpdir(), 'sproot-')),
        MOCK_GAUNTLET_FIXTURE: 'fail-no-usage',
      },
      encoding: 'utf8',
    },
  );
  const runId = (proc.stdout ?? '')
    .split('\n')
    .filter((l) => l.startsWith('run-id: '))
    .map((l) => l.slice('run-id: '.length))[0] as string;
  const raw = readFileSync(join(outRoot, runId, 'verdict.json'), 'utf8');
  expect(raw).not.toContain('"trial"');
});

test('quorum run --repeat writes trial index and count into each verdict', () => {
  const outRoot = mkdtempSync(join(tmpdir(), 'out-'));
  const proc = spawnSync(
    'bun',
    [
      CLI,
      'run',
      scenario(),
      '--coding-agent',
      'claude',
      '--coding-agents-dir',
      REAL_CODING_AGENTS,
      '--out-root',
      outRoot,
      '--repeat',
      '2',
    ],
    {
      env: {
        ...process.env,
        PATH: `${MOCK}:${process.env['PATH'] ?? ''}`,
        ANTHROPIC_API_KEY: 'sk-test',
        SUPERPOWERS_ROOT: mkdtempSync(join(tmpdir(), 'sproot-')),
        MOCK_GAUNTLET_FIXTURE: 'fail-no-usage',
      },
      encoding: 'utf8',
    },
  );
  const runIds = (proc.stdout ?? '')
    .split('\n')
    .filter((l) => l.startsWith('run-id: '))
    .map((l) => l.slice('run-id: '.length));
  expect(runIds).toHaveLength(2);
  const trials = runIds.map((id) => {
    const v = JSON.parse(
      readFileSync(join(outRoot, id, 'verdict.json'), 'utf8'),
    ) as { trial?: { index: number; count: number } };
    return v.trial;
  });
  expect(trials).toEqual([
    { index: 1, count: 2 },
    { index: 2, count: 2 },
  ]);
});

test('quorum run rejects a non-integer --repeat', () => {
  const { status, stderr } = runCli('fail-no-usage', ['--repeat', '2.5']);
  expect(stderr).toContain('error: --repeat must be an integer >= 1');
  expect(status).toBe(1);
});

test('quorum run rejects --repeat 0', () => {
  const { status, stderr } = runCli('fail-no-usage', ['--repeat', '0']);
  expect(stderr).toContain('error: --repeat must be an integer >= 1');
  expect(status).toBe(1);
});
