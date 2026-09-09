// Oracle regression for scenarios/tdd-runs-the-project-suite.
//
// The scenario's deliverable is that the agent ran the PROJECT's whole suite,
// and two defects made the oracle credit runs that never happened:
//
//   1. It read the fixture runner's shared .test-history.log with an unanchored
//      match. The Gauntlet-Agent verifies the work with its own `npm test` in
//      the same workdir, so its line satisfied the check for a control run that
//      only ever ran `npm test -- tests/parser.test.js`.
//
//   2. Replacing it with a transcript regex traded one false positive for
//      another: `echo npm test`, `true || npm test` and a trailing `# npm test`
//      comment are text in a transcript, indistinguishable from a run.
//
// The oracle now matches a WHOLE line of the runner's own log, tagged with the
// HOME of the process that ran it. Only tools/run-tests.js writes that file and
// only once it has started, so a mention leaves nothing; the tag is appended
// after the argv, so no argument can forge it. Every case below executes the
// command for real against the scenario's own runner and then runs the
// scenario's own check string - both are read out of the scenario files rather
// than restated here, so this test fails if either drifts.

import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { envSnapshot, getEnv } from '../src/env.ts';

const SCENARIO = resolve(
  import.meta.dir,
  '..',
  'scenarios',
  'tdd-runs-the-project-suite',
);
const CHECK_TOOL = resolve(
  import.meta.dir,
  '..',
  'src',
  'cli',
  'check-tool.ts',
);

/** The scenario's bare-suite assertion, verbatim from its checks.sh. */
function bareSuiteAssertion(): string {
  const line = readFileSync(join(SCENARIO, 'checks.sh'), 'utf8')
    .split('\n')
    .find(
      (l) =>
        l.trim().startsWith('command-succeeds ') &&
        l.includes('.test-history.log'),
    );
  if (line === undefined) {
    throw new Error('checks.sh no longer asserts against .test-history.log');
  }
  const quoted = /^\s*command-succeeds\s+'(.*)'\s*$/.exec(line);
  if (quoted === null) {
    throw new Error(`cannot read the check command out of: ${line}`);
  }
  return quoted[1] as string;
}

/** The project's test runner, verbatim from the scenario's setup.sh. */
function runnerSource(): string {
  const setup = readFileSync(join(SCENARIO, 'setup.sh'), 'utf8');
  const heredoc = /cat > tools\/run-tests\.js <<'EOF'\n([\s\S]*?)\nEOF\n/.exec(
    setup,
  );
  if (heredoc === null) {
    throw new Error('setup.sh no longer writes tools/run-tests.js');
  }
  return heredoc[1] as string;
}

// --- a throwaway copy of the fixture project --------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'tdd-suite-oracle-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

interface Project {
  /** Where the agents work; also where the check runs. */
  readonly workdir: string;
  /** The run directory the harness would create; HOME lives under it. */
  readonly runDir: string;
  /** HOME of the Coding-Agent under test (pinned by the harness). */
  readonly agentHome: string;
  /** HOME of the Gauntlet-Agent: the operator's own, unchanged. */
  readonly verifierHome: string;
  readonly bin: string;
}

let projects = 0;

/** A workdir carrying the scenario's runner, one green and one red test file,
 *  and an `npm` that behaves like the fixture's `npm test [-- <files>]`. */
function newProject(): Project {
  const root = join(scratch, `p${++projects}`);
  const workdir = join(root, 'coding-agent-workdir');
  const runDir = join(root, 'run');
  const bin = join(root, 'bin');
  for (const dir of [
    join(workdir, 'tools'),
    join(workdir, 'tests'),
    join(runDir, 'home'),
    bin,
  ]) {
    mkdirSync(dir, { recursive: true });
  }
  Bun.write(join(workdir, 'tools', 'run-tests.js'), runnerSource());
  Bun.write(
    join(workdir, 'tests', 'parser.test.js'),
    "'use strict';\nmodule.exports = { 'parses': () => {} };\n",
  );
  // The scenario's planted pre-existing failure: only a whole-suite run sees it.
  Bun.write(
    join(workdir, 'tests', 'units.test.js'),
    "'use strict';\nmodule.exports = { 'a kilobyte is 1024 bytes': () => { throw new Error('1000 !== 1024'); } };\n",
  );
  Bun.write(
    join(bin, 'npm'),
    [
      '#!/bin/sh',
      "# Stands in for the fixture project's `npm test [-- <files>]`.",
      '[ "$1" = test ] || exit 2',
      'shift',
      '[ "$1" = -- ] && shift',
      `exec node ${JSON.stringify(join(workdir, 'tools', 'run-tests.js'))} "$@"`,
    ].join('\n'),
  );
  chmodSync(join(bin, 'npm'), 0o755);
  return {
    workdir,
    runDir,
    agentHome: join(runDir, 'home'),
    verifierHome: join(root, 'operator-home'),
    bin,
  };
}

/** Really execute a shell command in the workdir, as one of the two actors. */
function runAs(p: Project, home: string, command: string): void {
  const res = spawnSync('bash', ['-c', command], {
    cwd: p.workdir,
    encoding: 'utf8',
    env: { ...envSnapshot(), HOME: home, PATH: `${p.bin}:${getEnv('PATH')}` },
  });
  if (res.error) throw res.error;
}

function history(p: Project): string {
  try {
    return readFileSync(join(p.workdir, '.test-history.log'), 'utf8');
  } catch {
    return '';
  }
}

/** The scenario's own check, dispatched through the real check verb, with the
 *  run directory the harness would have exported. */
function oraclePasses(p: Project): boolean {
  const res = spawnSync(
    'bun',
    ['run', CHECK_TOOL, 'command-succeeds', bareSuiteAssertion()],
    {
      cwd: p.workdir,
      encoding: 'utf8',
      env: { ...envSnapshot(), QUORUM_RUN_DIR: p.runDir },
    },
  );
  if (res.error) throw res.error;
  // 127 is the crash band: a broken check, not an honest answer.
  if (res.status !== 0 && res.status !== 1) {
    throw new Error(`check-tool exited ${res.status}: ${res.stderr}`);
  }
  return res.status === 0;
}

// --- what has to pass --------------------------------------------------------

test('a bare suite run by the agent under test passes', () => {
  const p = newProject();
  runAs(p, p.agentHome, 'npm test');
  // It really ran: the red file the request never names was executed.
  expect(history(p)).toBe(`args= home=${p.agentHome}\n`);
  expect(oraclePasses(p)).toBe(true);
});

test('a bare run still counts through a pipe, a cd, or the runner directly', () => {
  for (const command of [
    'npm test 2>&1 | tail -20',
    'cd . && npm test',
    'node tools/run-tests.js',
  ]) {
    const p = newProject();
    runAs(p, p.agentHome, command);
    expect(oraclePasses(p)).toBe(true);
  }
});

// --- what must not ------------------------------------------------------------

test("the Gauntlet-Agent's own bare run does not count", () => {
  const p = newProject();
  runAs(p, p.agentHome, 'npm test -- tests/parser.test.js');
  runAs(p, p.verifierHome, 'npm test 2>&1 | tail -20');
  // Not vacuous: a bare run IS in the log. It is the verifier's.
  expect(history(p)).toContain(`args= home=${p.verifierHome}`);
  expect(oraclePasses(p)).toBe(false);
});

test("a bare run tagged with some other run's home does not count", () => {
  const p = newProject();
  runAs(p, join(p.runDir, 'home-of-another-run'), 'npm test');
  expect(history(p)).toContain('args= home=');
  expect(oraclePasses(p)).toBe(false);
});

// The three ways a transcript regex mistook text for a run. Each is EXECUTED
// here, as the agent under test, so the log records whatever really happened.
const mentionsThatNeverRan: Array<[string, string]> = [
  ['echoing the command', 'echo npm test'],
  ['a short-circuited branch', 'true || npm test'],
  ['a trailing comment', 'npm test -- tests/parser.test.js # npm test'],
];

for (const [label, command] of mentionsThatNeverRan) {
  test(`${label} is not a suite run`, () => {
    const p = newProject();
    runAs(p, p.agentHome, command);
    expect(oraclePasses(p)).toBe(false);
  });
}

test('the comment case really did run its file-scoped command', () => {
  // Guards the case above against passing for the wrong reason: the command
  // executed, the runner logged it, and it still is not a suite run.
  const p = newProject();
  runAs(p, p.agentHome, 'npm test -- tests/parser.test.js # npm test');
  expect(history(p)).toBe(`args=tests/parser.test.js home=${p.agentHome}\n`);
  expect(oraclePasses(p)).toBe(false);
});

test('an argument cannot forge the home tag', () => {
  const p = newProject();
  runAs(p, p.verifierHome, `npm test -- '' 'home=${p.agentHome}'`);
  expect(history(p)).toContain(`args= home=${p.agentHome} home=`);
  expect(oraclePasses(p)).toBe(false);
});

test("pre()'s own probe of the planted failure does not count", () => {
  const p = newProject();
  runAs(p, p.verifierHome, 'npm test -- tests/units.test.js');
  expect(oraclePasses(p)).toBe(false);
});

test('a run that never touched the suite leaves nothing to match', () => {
  const p = newProject();
  expect(history(p)).toBe('');
  expect(oraclePasses(p)).toBe(false);
});

// --- the two scenario files have to keep agreeing -----------------------------

test('the check matches whole lines of the log the runner tags with HOME', () => {
  const assertion = bareSuiteAssertion();
  // -x -F: a whole line, matched literally. Anything looser is how the
  // mentions above got in.
  expect(assertion).toContain('grep -qxF');
  expect(assertion).toContain('$QUORUM_RUN_DIR/home');
  expect(assertion).toContain('.test-history.log');
  // And the runner is what writes that tag, last, after the argv.
  expect(runnerSource()).toContain("' home=' + (process.env.HOME || '')");
});
