import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { seedCodexApproveStub } from '../src/setup-helpers/codex-approve-stub.ts';
import { runStubCases, type StubCase } from './codex-stub-cases.ts';

// Eight brainstorming scenarios install one Codex companion stub,
// fixtures/codex-stubs/approve-companion.mjs, through the
// seed_codex_approve_stub setup-helper. Before, each carried its own 210-line
// heredoc copy. The golden file records every behaviour of the copy the seven
// ported scenarios shared; the fixture must reproduce each one, so moving the
// stub changed nothing a session can observe.

const EVALS = resolve(import.meta.dir, '..');
const FIXTURE = join(EVALS, 'fixtures', 'codex-stubs', 'approve-companion.mjs');
const GOLDEN = join(
  import.meta.dir,
  'fixtures',
  'codex-approve-stub-golden.json',
);
const SCENARIOS = [
  'brainstorming-asks-tooling-question',
  'brainstorming-bounded-fires-approach-gate',
  'brainstorming-router-escalates-b1-userid-param',
  'brainstorming-router-escalates-b2-config-module',
  'brainstorming-router-escalates-b3-logging',
  'brainstorming-router-escalates-b4-reusable-validation',
  'brainstorming-router-escalates-b5-prefs-storage',
  'brainstorming-router-no-downgrade',
];

const observed = runStubCases(FIXTURE);
const byName = new Map(observed.map((c) => [c.name, c]));

test('the shared stub is valid JavaScript', () => {
  const r = spawnSync('node', ['--check', FIXTURE], { encoding: 'utf8' });
  expect(r.stderr).toBe('');
  expect(r.status).toBe(0);
});

test('the shared stub reproduces every recorded behaviour of the stub it replaced', () => {
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as StubCase[];
  expect(golden.length).toBe(21);
  expect(observed).toEqual(golden);
});

test('a task call without a prompt fails instead of approving, and setup is never logged', () => {
  for (const name of [
    'task with a missing prompt file',
    'task with an empty prompt file',
    'task with no prompt',
  ]) {
    expect(byName.get(name)?.status).toBe(2);
    expect(byName.get(name)?.stdout).toBe('');
    expect(byName.get(name)?.log).toContain(' kind=no-prompt ');
  }
  expect(byName.get('setup --json')?.log).toBe('');
  expect(byName.get('task approaches')?.log).toContain('task kind=approaches ');
  expect(byName.get('task spec-review')?.log).toContain(
    'task kind=spec-review ',
  );
});

test('seed_codex_approve_stub installs the fixture, the manifest and the registry under the agent home', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'approve-stub-'));
  try {
    const workdir = join(runDir, 'coding-agent-workdir');
    const home = join(runDir, 'home');
    mkdirSync(workdir, { recursive: true });
    mkdirSync(home, { recursive: true });
    seedCodexApproveStub({
      workdir,
      templateDir: undefined,
      superpowersRoot: undefined,
      run: { run: () => ({ status: 0, stdout: '', stderr: '' }) },
    });
    const install = join(
      home,
      '.claude',
      'plugins',
      'cache',
      'openai-codex',
      'codex',
      'stub',
    );
    const companion = join(install, 'scripts', 'codex-companion.mjs');
    expect(readFileSync(companion, 'utf8')).toBe(readFileSync(FIXTURE, 'utf8'));
    expect(statSync(companion).mode & 0o777).toBe(0o755);
    expect(
      readFileSync(join(install, '.claude-plugin', 'plugin.json'), 'utf8'),
    ).toBe('{ "name": "codex", "version": "0.0.0-stub" }\n');
    expect(
      readFileSync(
        join(home, '.claude', 'plugins', 'installed_plugins.json'),
        'utf8',
      ),
    ).toBe(
      `${JSON.stringify(
        {
          version: 2,
          plugins: {
            'codex@openai-codex': [
              {
                scope: 'user',
                installPath: install,
                version: 'stub',
                installedAt: '2026-01-01T00:00:00.000Z',
                lastUpdated: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test('each of the eight scenarios installs the shared stub through the helper and carries no copy of it', () => {
  for (const s of SCENARIOS) {
    const setup = readFileSync(join(EVALS, 'scenarios', s, 'setup.sh'), 'utf8');
    expect(setup).toContain('setup-helpers run seed_codex_approve_stub');
    expect(setup).not.toContain('codex-companion.mjs');
  }
});
