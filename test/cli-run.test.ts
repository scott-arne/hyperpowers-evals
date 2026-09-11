import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
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

interface CliOptions {
  readonly env?: Readonly<Record<string, string>>;
  // Route the CLI's stdout through `cat` instead of straight into spawnSync.
  // spawnSync drains its end of the pipe eagerly, which keeps the pipe empty
  // and hides a flush bug; a copying reader lets the pipe fill and pushes the
  // CLI's later writes into its own userspace buffer.
  readonly pipe?: boolean;
}

function runCli(
  fixture: string,
  extraArgs: readonly string[] = [],
  opts: CliOptions = {},
): {
  status: number | null;
  stdout: string;
  stderr: string;
  outRoot: string;
} {
  // Hoisted so a caller can read the run dirs the CLI wrote under it.
  const outRoot = mkdtempSync(join(tmpdir(), 'out-'));
  const argv = [
    CLI,
    'run',
    scenario(),
    '--coding-agent',
    'claude',
    '--coding-agents-dir',
    REAL_CODING_AGENTS,
    '--out-root',
    outRoot,
    ...extraArgs,
  ];
  // pipefail keeps the observed status the CLI's own rather than cat's.
  const command = opts.pipe ? 'bash' : 'bun';
  const args = opts.pipe
    ? ['-c', 'set -o pipefail; "$@" | cat', 'quorum', 'bun', ...argv]
    : argv;
  const proc = spawnSync(command, args, {
    env: {
      ...process.env,
      PATH: `${MOCK}:${process.env['PATH'] ?? ''}`,
      ANTHROPIC_API_KEY: 'sk-test',
      // The real claude.yaml lists SUPERPOWERS_ROOT in required_env and the
      // $SUPERPOWERS_ROOT context substitution reads it.
      SUPERPOWERS_ROOT: mkdtempSync(join(tmpdir(), 'sproot-')),
      MOCK_GAUNTLET_FIXTURE: fixture,
      ...opts.env,
    },
    encoding: 'utf8',
  });
  return {
    status: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    outRoot,
  };
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
}, 30_000);

test('quorum run --repeat 3 on a passing scenario exits 0', () => {
  const { status, stdout } = runCli('pass', ['--repeat', '3']);
  expect(stdout).toContain('trials: PPP');
  expect(status).toBe(0);
}, 30_000);

test('quorum run without --repeat prints no trial vector', () => {
  const { stdout, status } = runCli('fail-no-usage');
  expect(stdout).not.toContain('trials:');
  expect(status).toBe(1);
});

test('quorum run --repeat 1 adds the vector line and stamps the trial', () => {
  const { status, stdout, outRoot } = runCli('fail-no-usage', [
    '--repeat',
    '1',
  ]);
  const runIds = stdout
    .split('\n')
    .filter((l) => l.startsWith('run-id: '))
    .map((l) => l.slice('run-id: '.length));
  expect(runIds).toHaveLength(1);
  expect(stdout).toContain('trials: F');
  expect(status).toBe(1);
  // The distinction the option source exists for: an explicit `--repeat 1`
  // stamps the trial, an omitted flag does not. A test that only checked the
  // value would pass against the broken `opts.repeat !== '1'` guard.
  const v = JSON.parse(
    readFileSync(join(outRoot, runIds[0] as string, 'verdict.json'), 'utf8'),
  ) as { trial?: { index: number; count: number } };
  expect(v.trial).toEqual({ index: 1, count: 1 });
}, 30_000);

test('quorum run without --repeat writes no trial field', () => {
  const { stdout, outRoot } = runCli('fail-no-usage');
  const runId = stdout
    .split('\n')
    .filter((l) => l.startsWith('run-id: '))
    .map((l) => l.slice('run-id: '.length))[0] as string;
  const raw = readFileSync(join(outRoot, runId, 'verdict.json'), 'utf8');
  expect(raw).not.toContain('"trial"');
});

test('quorum run --repeat writes trial index and count into each verdict', () => {
  const { stdout, outRoot } = runCli('fail-no-usage', ['--repeat', '2']);
  const runIds = stdout
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
}, 30_000);

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

// A fixture whose reasoning is large enough that rendering it overflows the OS
// pipe buffer. The renderer prints gauntlet.reasoning in full, so this is the
// cheapest way to make the CLI's stdout exceed what a pipe absorbs in one go.
function bigFixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bigfix-'));
  // Clone the real fail-no-usage fixture so the run still reaches a genuine
  // fail verdict (it carries the claude-session.jsonl the capture diff needs),
  // then swap in an outsized reasoning.
  cpSync(
    join(import.meta.dir, 'mock-gauntlet', 'fixtures', 'fail-no-usage'),
    dir,
    {
      recursive: true,
    },
  );
  writeFileSync(
    join(dir, 'result.json'),
    JSON.stringify({
      schemaVersion: 5,
      runId: 'mock_big_0000',
      status: 'fail',
      summary: 'no',
      reasoning: `AC2 unmet ${'x'.repeat(300_000)}`,
      duration_ms: 500,
      config: { model: 'claude-opus-4-8' },
    }),
  );
  return dir;
}

test('the trials line survives a render that overflows a piped stdout', () => {
  // Regression: the run action used to end in process.exit(exitCode), which
  // drops whatever stdout still has buffered. Piped into anything that does not
  // drain instantly — `quorum run | tee`, a CI log collector — the two verdict
  // renders queued ahead of it meant the trials: line, the feature's only
  // aggregate output, was exactly what got discarded.
  const { status, stdout } = runCli('fail-no-usage', ['--repeat', '2'], {
    env: { MOCK_GAUNTLET_FIXTURE_DIR: bigFixtureDir() },
    pipe: true,
  });
  // Slice the tail: the line is the last thing written, and a whole-buffer
  // toContain would dump half a megabyte into the failure output.
  expect(stdout.slice(-200)).toContain('trials: FF');
  // And nothing ahead of it was dropped either: the whole render arrived, far
  // past any pipe buffer.
  expect(stdout.length).toBeGreaterThan(500_000);
  // Still the aggregate exit code, and it arrived rather than hanging.
  expect(status).toBe(1);
}, 30_000);
