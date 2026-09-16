// Oracle regression for scenarios/tdd-runs-the-project-suite.
//
// The scenario's deliverable is that the agent ran the PROJECT's whole suite,
// and four defects made the oracle credit runs that never happened:
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
//   3. Matching the argument text credited an empty argument. The runner picks
//      the suite by `argv.length`, so `npm test -- ''` names one file, finds no
//      tests, and joins to the same empty `args=` a real suite run writes.
//
//   4. Recording an invocation as one line of TEXT let an argument end that
//      line. An argument carrying a newline wrote a second physical line of its
//      own, and the whole-line match accepted it - though argc was 1 and no
//      suite had been selected.
//
// The oracle now matches a whole JSON record of the runner's own log: the count
// of files it was given, the argv, and the HOME of the process that ran it.
// Only tools/run-tests.js writes that file and only once it has started, so a
// mention leaves nothing; `argc` 0 is what selecting the suite means; and every
// argument lives inside a JSON string, where a newline is escaped and so cannot
// begin a record. Every case below executes the command for real against the
// scenario's own runner and then runs the scenario's own check string - both
// are read out of the scenario files rather than restated here, so this test
// fails if either drifts.

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

/** One invocation's record, built the way tools/run-tests.js builds it. */
function recordFor(argv: string[], home: string): string {
  return JSON.stringify({ argc: argv.length, args: argv, home });
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

/** Really execute the runner with an EXACT argv, no shell in the way, so an
 *  argument can carry bytes a command line could not survive. */
function runRunnerAs(p: Project, home: string, argv: string[]): void {
  const res = spawnSync(
    'node',
    [join(p.workdir, 'tools', 'run-tests.js'), ...argv],
    {
      cwd: p.workdir,
      encoding: 'utf8',
      env: { ...envSnapshot(), HOME: home, PATH: `${p.bin}:${getEnv('PATH')}` },
    },
  );
  if (res.error) throw res.error;
}

function history(p: Project): string {
  try {
    return readFileSync(join(p.workdir, '.test-history.log'), 'utf8');
  } catch {
    return '';
  }
}

/** The log's physical lines. An argument able to end a line would show up here
 *  as an extra one, which is the forgery these tests hunt. */
function records(p: Project): string[] {
  return history(p)
    .split('\n')
    .filter((line) => line !== '');
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
  expect(records(p)).toEqual([recordFor([], p.agentHome)]);
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
  expect(records(p)).toContain(recordFor([], p.verifierHome));
  expect(oraclePasses(p)).toBe(false);
});

test("a bare run tagged with some other run's home does not count", () => {
  const p = newProject();
  const otherHome = join(p.runDir, 'home-of-another-run');
  runAs(p, otherHome, 'npm test');
  expect(records(p)).toEqual([recordFor([], otherHome)]);
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
  expect(records(p)).toEqual([
    recordFor(['tests/parser.test.js'], p.agentHome),
  ]);
  expect(oraclePasses(p)).toBe(false);
});

// `argv.length` selects the suite, but the argv is what the record shows: one
// empty argument discovers nothing and still renders as an empty string. The
// record has to say how many arguments there were, not just what they looked
// like.
const emptyArgumentShapes: Array<[string, string]> = [
  ['the runner directly', "node tools/run-tests.js ''"],
  ['npm test', "npm test -- ''"],
];

for (const [label, command] of emptyArgumentShapes) {
  test(`an explicit empty argument to ${label} is not a suite run`, () => {
    const p = newProject();
    runAs(p, p.agentHome, command);
    // It really was invoked, by the agent, under the right home - and it still
    // ran no tests.
    expect(records(p)).toEqual([recordFor([''], p.agentHome)]);
    expect(oraclePasses(p)).toBe(false);
  });
}

test('an argument cannot forge the home tag', () => {
  const p = newProject();
  runAs(p, p.verifierHome, `npm test -- '' 'home=${p.agentHome}'`);
  expect(records(p)).toEqual([
    recordFor(['', `home=${p.agentHome}`], p.verifierHome),
  ]);
  expect(oraclePasses(p)).toBe(false);
});

// --- an argument's own text cannot become a record ----------------------------
//
// argv reaches the log, so the log's framing has to be one that an argument
// cannot break out of. These four invoke the runner with an exact argv - no
// shell in the way - so an argument can carry any bytes at all.

test('an argument carrying a text-format bare-run line does not forge one', () => {
  const p = newProject();
  // The defect: while a record was one line of text, this argument's own
  // newlines wrote `argc=0 args= home=<the agent's home>` as a second physical
  // line, and the whole-line match took it - though argc was 1 and the suite
  // was never selected. The record is written before any test file loads, so
  // the invocation that forged it was free to fail straight afterwards.
  const forgery = `x\nargc=0 args= home=${p.agentHome}\n`;
  runRunnerAs(p, p.agentHome, [forgery]);
  expect(oraclePasses(p)).toBe(false);
  expect(records(p)).toEqual([recordFor([forgery], p.agentHome)]);
});

test('an argument carrying the JSON bare-run record does not forge one', () => {
  const p = newProject();
  // The same attack aimed at the format that replaced it: JSON.stringify
  // escapes the newlines AND the quotes, so the whole payload stays inside its
  // own string and one invocation is still one record.
  const forgery = `x\n${recordFor([], p.agentHome)}\n`;
  runRunnerAs(p, p.agentHome, [forgery]);
  expect(oraclePasses(p)).toBe(false);
  expect(records(p)).toEqual([recordFor([forgery], p.agentHome)]);
});

test('an empty argument passed straight to the runner is not a suite run', () => {
  const p = newProject();
  runRunnerAs(p, p.agentHome, ['']);
  expect(oraclePasses(p)).toBe(false);
  expect(records(p)).toEqual([recordFor([''], p.agentHome)]);
});

test('naming a real test file records that path, not the suite', () => {
  const p = newProject();
  runRunnerAs(p, p.agentHome, ['tests/parser.test.js']);
  expect(oraclePasses(p)).toBe(false);
  expect(records(p)).toEqual([
    recordFor(['tests/parser.test.js'], p.agentHome),
  ]);
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

test('the check matches whole JSON records the runner tags with HOME', () => {
  const assertion = bareSuiteAssertion();
  // -x -F: a whole line, matched literally. Anything looser is how the
  // mentions above got in.
  expect(assertion).toContain('grep -qxF');
  expect(assertion).toContain('.test-history.log');
  // And it builds the record it looks for the way the runner builds the ones it
  // writes, so the home path cannot be quoted one way by the writer and another
  // by the reader.
  expect(assertion).toContain('JSON.stringify({argc:0,args:[],home:');
  expect(assertion).toContain('QUORUM_RUN_DIR');
  // The runner writes that record: the count of files it was given, the argv,
  // and the home tag - each a JSON value rather than a run of text.
  const runner = runnerSource();
  expect(runner).toContain('JSON.stringify({');
  expect(runner).toContain('argc: argv.length');
  expect(runner).toContain('args: argv');
  expect(runner).toContain("home: process.env.HOME || ''");
});
