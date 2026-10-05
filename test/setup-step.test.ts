import { expect, test } from 'bun:test';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../src/paths.ts';
import { assertFixtureRepo, runSetup, SetupError } from '../src/setup-step.ts';

test('runSetup runs setup.sh in workdir with QUORUM_WORKDIR', () => {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  writeFileSync(
    join(scn, 'setup.sh'),
    '#!/usr/bin/env bash\necho "$QUORUM_WORKDIR" > marker.txt\n',
  );
  chmodSync(join(scn, 'setup.sh'), 0o755);
  runSetup(scn, wd);
  expect(readFileSync(join(wd, 'marker.txt'), 'utf8').trim()).toBe(wd);
});

test('non-zero setup.sh throws SetupError with output', () => {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  writeFileSync(
    join(scn, 'setup.sh'),
    '#!/usr/bin/env bash\necho boom >&2\nexit 3\n',
  );
  chmodSync(join(scn, 'setup.sh'), 0o755);
  expect(() => runSetup(scn, wd)).toThrow(SetupError);
});

test('SetupError carries stdout and stderr', () => {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  writeFileSync(
    join(scn, 'setup.sh'),
    '#!/usr/bin/env bash\necho out-line\necho err-line >&2\nexit 1\n',
  );
  chmodSync(join(scn, 'setup.sh'), 0o755);
  try {
    runSetup(scn, wd);
    throw new Error('expected runSetup to throw');
  } catch (err) {
    expect(err).toBeInstanceOf(SetupError);
    const message = (err as SetupError).message;
    expect(message).toContain('out-line');
    expect(message).toContain('err-line');
  }
});

test('envExtra is passed through to setup.sh', () => {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  writeFileSync(
    join(scn, 'setup.sh'),
    '#!/usr/bin/env bash\necho "$EXTRA_TOKEN" > token.txt\n',
  );
  chmodSync(join(scn, 'setup.sh'), 0o755);
  runSetup(scn, wd, { EXTRA_TOKEN: 'hello-extra' });
  expect(readFileSync(join(wd, 'token.txt'), 'utf8').trim()).toBe(
    'hello-extra',
  );
});

// K-setup-spawn-error-swallowed: Python _run_scenario_script returns early when
// setup.sh is absent (no-op) and lets subprocess.run raise on a spawn-level
// failure (e.g. a non-executable file). TS must not silently succeed: it must
// no-op on missing and throw on an un-spawnable script.
test('missing setup.sh is a no-op (parity with Python early-return)', () => {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  // no setup.sh written
  expect(() => runSetup(scn, wd)).not.toThrow();
});

test('non-executable setup.sh throws instead of silently succeeding', () => {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  writeFileSync(
    join(scn, 'setup.sh'),
    '#!/usr/bin/env bash\necho should-not-run\n',
  );
  // deliberately NOT chmod +x => spawnSync sets proc.error (EACCES), status null
  expect(() => runSetup(scn, wd)).toThrow(SetupError);
});

// H4-setup-large-output-enobuf: spawnSync's default maxBuffer is 1 MB of
// stdout+stderr. A verbose-but-successful setup.sh (git clone / bun install /
// uv sync routinely exceed 1 MB) returns {status:null, error:{code:'ENOBUFS'}},
// which the spawn-error guard then throws as a SetupError — mislabeling success
// as a spawn failure. Python's subprocess.run has no output cap. Parity: a
// setup.sh that emits >1 MB to stdout then exits 0 must succeed (no throw).
test('a setup.sh emitting >1 MB then exiting 0 succeeds (no ENOBUFS mislabel)', () => {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  writeFileSync(
    join(scn, 'setup.sh'),
    // ~2 MB of stdout (2M chars), well past Node's 1 MB default maxBuffer.
    "#!/usr/bin/env bash\nhead -c 2000000 /dev/zero | tr '\\0' 'x'\nexit 0\n",
  );
  chmodSync(join(scn, 'setup.sh'), 0o755);
  expect(() => runSetup(scn, wd)).not.toThrow();
});

test('runSetup plumbs QUORUM_REPO_ROOT into setup.sh', () => {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  writeFileSync(
    join(scn, 'setup.sh'),
    '#!/usr/bin/env bash\necho "$QUORUM_REPO_ROOT" > repo-root.txt\n',
  );
  chmodSync(join(scn, 'setup.sh'), 0o755);
  // This is the exact env_extra the runner passes (quorum/runner.py parity).
  runSetup(scn, wd, { QUORUM_REPO_ROOT: repoRoot() });
  expect(readFileSync(join(wd, 'repo-root.txt'), 'utf8').trim()).toBe(
    repoRoot(),
  );
});

// A real run's fixture sits under evals/results/ inside this clone, so a
// fixture that is not a git repository of its own would let an agent's walk
// for project instructions reach this repository's AGENTS.md. Inside another
// repository's tree a missing .git is a setup failure; outside any repository
// (where the harness's own tests build their scenarios) there is nothing to
// inherit and the fixture is left alone.
function repoWithFixture(): { repo: string; workdir: string } {
  const repo = mkdtempSync(join(tmpdir(), 'enclosing-'));
  mkdirSync(join(repo, '.git'));
  const workdir = join(repo, 'results', 'r1', 'coding-agent-workdir');
  mkdirSync(workdir, { recursive: true });
  return { repo, workdir };
}

test('assertFixtureRepo throws SetupError for a .git-less fixture inside another repository', () => {
  const { repo, workdir } = repoWithFixture();
  expect(() => assertFixtureRepo(workdir)).toThrow(SetupError);
  expect(() => assertFixtureRepo(workdir)).toThrow(repo);
});

test('assertFixtureRepo accepts a fixture with its own .git directory or gitfile', () => {
  const asDir = repoWithFixture();
  mkdirSync(join(asDir.workdir, '.git'));
  expect(() => assertFixtureRepo(asDir.workdir)).not.toThrow();
  const asFile = repoWithFixture();
  writeFileSync(
    join(asFile.workdir, '.git'),
    'gitdir: /elsewhere/.git/worktrees/x\n',
  );
  expect(() => assertFixtureRepo(asFile.workdir)).not.toThrow();
});

test('assertFixtureRepo leaves a .git-less fixture outside any repository alone', () => {
  const wd = mkdtempSync(join(tmpdir(), 'wd-'));
  expect(() => assertFixtureRepo(wd)).not.toThrow();
});
