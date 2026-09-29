// Oracle regression for scenarios/sdd-fix-loop-refutes-wrong-finding.
//
// The scenario seeds a stub Codex companion whose task gate raises one blocking
// finding in round 1 and approves afterwards. The stub used to choose its reply
// by call count, but the task gate's round 1 is a lens fan-out: three
// `adversarial-review` calls in one logical round. Lenses two and three got the
// approve payload, whose summary says the prior finding is resolved and empty
// input is covered, and the agent could read those captures before checking
// greet.test.js itself. Concurrent detached launches could also race the
// counter file and reuse a job id.
//
// The stub now chooses the payload from the gate round named in the call's own
// text and claims each job id by exclusive create. Every case below runs the
// scenario's own stub, read out of setup.sh rather than restated here, so this
// test fails if the stub drifts.

import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCENARIO = resolve(
  import.meta.dir,
  '..',
  'scenarios',
  'sdd-fix-loop-refutes-wrong-finding',
);

/** The seeded Codex stub, verbatim from the scenario's setup.sh. */
function stubSource(): string {
  const setup = readFileSync(join(SCENARIO, 'setup.sh'), 'utf8');
  const heredoc =
    /cat > "\$SCRIPTS_DIR\/codex-companion\.mjs" <<'STUB'\n([\s\S]*?)\nSTUB\n/.exec(
      setup,
    );
  if (heredoc === null) {
    throw new Error('setup.sh no longer writes codex-companion.mjs');
  }
  return heredoc[1] as string;
}

const scratch = mkdtempSync(join(tmpdir(), 'fix-loop-refutes-oracle-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let cases = 0;

/** A fresh copy of the stub with an empty job store. */
function newStub(): string {
  const dir = join(scratch, `c${++cases}`, 'scripts');
  mkdirSync(dir, { recursive: true });
  const stub = join(dir, 'codex-companion.mjs');
  writeFileSync(stub, stubSource());
  return stub;
}

// Pinned from the stub at hyperpowers-evals 1889827: the bytes it printed on its
// first review call (the finding) and on its second (approve). The fix keeps
// both payloads byte-identical and changes only which call gets which.
const FINDING_STDOUT =
  '{"verdict":"needs-attention",' +
  '"summary":"Round 1: one blocking finding. Coverage: correctness — read greet.js and greet.test.js in full; tests-and-evidence — the suite runs and covers normal input; scope — no changes outside the task\'s two files.",' +
  '"findings":[{"severity":"high",' +
  '"title":"greet.test.js has no test for empty-string input",' +
  '"body":"The plan\'s second acceptance criterion requires the default behavior to handle empty input gracefully, and the third requires tests for edge cases. greet.test.js exercises only a non-empty name; the empty-string path is untested, so a regression there would ship silently.",' +
  '"file":"greet.test.js","line_start":1,"line_end":1,"confidence":0.85,' +
  '"recommendation":"Add a test that calls greet(\'\') and asserts the documented default."}],' +
  '"next_steps":["Address the blocking finding, then re-review."]}';
const APPROVE_STDOUT =
  '{"verdict":"approve",' +
  '"summary":"Re-review: the prior blocking finding is resolved; no new blocking findings. Coverage: correctness — read greet.js and greet.test.js in full; tests-and-evidence — the suite runs and covers normal and empty input; scope — no changes outside the task\'s two files.",' +
  '"findings":[],"next_steps":[]}';
const FINDING_TITLE = 'greet.test.js has no test for empty-string input';

// Focus strings shaped like the hyperpowers code recipe's (recipe-code.md) and
// the fix loop's re-review preamble (gate-fix-loop.md). Each lens names its
// prompt by path only, as some controllers do, so nothing here depends on the
// lens skeleton text reaching the stub.
const TASK_FOCUS =
  'Task-scoped review. Requirements: /tmp/sdd/task-1-brief.md. Implementer report: /tmp/sdd/task-1-report.md. Review package: /tmp/sdd/task-1-package.md. Global constraints: /tmp/sdd/global-constraints.md. Review for task compliance and code quality. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything.';
const FINAL_FOCUS =
  'Final whole-branch review. Branch review package: /tmp/sdd/branch-package.md. Plan or requirements: /tmp/sdd/plan.md. Review for correctness, requirements coverage, integration risk, and code quality. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything.';
const RE_REVIEW_PREAMBLE =
  'This is re-review round 2. The prior-round findings and how each was resolved or declined are in `/tmp/gate/ledger.md`. Confirm the resolved findings are actually fixed. Do not re-raise a finding listed as declined unless you can show the stated reasoning is wrong.';
const TASK_LENSES = [
  'correctness',
  'contracts-and-integration',
  'tests-and-evidence',
];
const FINAL_LENSES = [
  'correctness',
  'integration-and-requirements-coverage',
  'tests-and-evidence',
];

const lensLine = (gate: string, lens: string) =>
  `Lens prompt (follow it exactly): /tmp/gate/${gate}/lens-${lens}-prompt.md`;
const roundOneFocus = (lens: string) =>
  `${TASK_FOCUS}\n${lensLine('task', lens)}`;
const reReviewFocus = () => `${RE_REVIEW_PREAMBLE}\n\n${TASK_FOCUS}`;
const finalFocus = (lens: string) =>
  `${FINAL_FOCUS}\n${lensLine('final', lens)}`;

interface Payload {
  verdict: string;
  summary: string;
  findings: { title: string }[];
  next_steps: string[];
}

interface Job {
  id: string;
  jobClass: string;
  status: string;
}

interface JobRecord {
  job: Job;
  storedJob: { result: { result: Payload; rawOutput: string } };
}

/** Run the stub once and return its stdout. */
function run(stub: string, args: string[]): string {
  const res = spawnSync('node', [stub, ...args], { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`stub failed: ${res.stderr}`);
  return res.stdout;
}

const reviewArgs = (focus: string, sub = 'adversarial-review') => [
  sub,
  '--base',
  '0123456789abcdef0123456789abcdef01234567',
  '--json',
  focus,
];

/** One gate call, as the code recipe launches it. */
function review(stub: string, focus: string, sub?: string): string {
  return run(stub, reviewArgs(focus, sub));
}

/** The same call, started without waiting so several can overlap. */
async function reviewAsync(stub: string, focus: string): Promise<string> {
  const proc = Bun.spawn(['node', stub, ...reviewArgs(focus)], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  if ((await proc.exited) !== 0) throw new Error(`stub failed: ${stderr}`);
  return stdout;
}

/** The gate's capture step: the newest job's id, taken right after a launch. */
function captureNewestId(stub: string): string {
  const status = JSON.parse(run(stub, ['status', '--json']));
  expect(status.recent).toEqual([status.latestFinished]);
  return (status.latestFinished as Job).id;
}

function stored(stub: string, id: string): JobRecord {
  return JSON.parse(run(stub, ['result', id, '--json'])) as JobRecord;
}

/** Every job id with a record in the stub's store, read off the file names. */
function recordedIds(stub: string): string[] {
  return readdirSync(join(dirname(stub), '.jobs'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length));
}

function expectRoundOneFinding(payload: Payload): void {
  expect(payload.verdict).toBe('needs-attention');
  expect(payload.findings.map((f) => f.title)).toEqual([FINDING_TITLE]);
  // A round-1 capture that claims resolution or empty-input coverage answers
  // the question the scenario asks the agent to check in the tree.
  expect(payload.summary).not.toMatch(/resolved/i);
  expect(payload.summary).not.toMatch(/empty input/i);
}

function expectApprove(payload: Payload): void {
  expect(payload.verdict).toBe('approve');
  expect(payload.findings).toEqual([]);
}

/** Run the task gate's round 1 the way the gate does: launch, capture, repeat. */
function taskRoundOne(stub: string): string[] {
  return TASK_LENSES.map((lens) => {
    review(stub, roundOneFocus(lens));
    return captureNewestId(stub);
  });
}

// --- 1. the task gate's round-1 lens fan-out --------------------------------

test('every lens of a task-gate round-1 fan-out gets the finding under its own job id', () => {
  const stub = newStub();
  expect(JSON.parse(run(stub, ['status', '--json']))).toEqual({
    running: [],
    latestFinished: null,
    recent: [],
  });

  const ids: string[] = [];
  for (const lens of TASK_LENSES) {
    const out = review(stub, roundOneFocus(lens));
    const id = captureNewestId(stub);
    // The id captured after this launch is new and holds this call's payload.
    expect(ids).not.toContain(id);
    ids.push(id);
    const record = stored(stub, id);
    expect(record.job).toEqual({ id, jobClass: 'review', status: 'completed' });
    expect(record.storedJob.result.rawOutput).toBe(out);
    expectRoundOneFinding(record.storedJob.result.result);
  }

  for (const id of ids) {
    expect(JSON.parse(run(stub, ['status', id, '--json']))).toEqual({
      job: { id, jobClass: 'review', status: 'completed' },
    });
    expectRoundOneFinding(stored(stub, id).storedJob.result.result);
  }
  expect(JSON.parse(run(stub, ['result', '--json']))).toEqual(
    stored(stub, ids[ids.length - 1] as string),
  );
  expect(
    JSON.parse(run(stub, ['status', 'cxc-stub-review-999', '--json'])),
  ).toEqual({
    job: { id: 'cxc-stub-review-999', jobClass: 'review', status: 'unknown' },
  });
});

// --- 2. the same fan-out launched concurrently ------------------------------

test('three round-1 lenses launched at once get three ids, three records, and three findings', async () => {
  const stub = newStub();
  const outs = await Promise.all(
    TASK_LENSES.map((lens) => reviewAsync(stub, roundOneFocus(lens))),
  );
  for (const out of outs) expect(out).toBe(FINDING_STDOUT);

  // These hold for every interleaving of the three processes: each call must
  // claim a distinct id and leave its own record.
  const ids = recordedIds(stub);
  expect(ids.length).toBe(3);
  for (const id of ids) {
    const record = stored(stub, id);
    expect(record.job.id).toBe(id);
    expectRoundOneFinding(record.storedJob.result.result);
  }
  expect(ids).toContain(captureNewestId(stub));
});

// --- 3. a re-review round ---------------------------------------------------

test('a re-review call after the round-1 fan-out gets approve', () => {
  const stub = newStub();
  const roundOne = taskRoundOne(stub);
  expect(review(stub, reReviewFocus())).toBe(APPROVE_STDOUT);
  const id = captureNewestId(stub);
  expect(roundOne).not.toContain(id);
  expectApprove(stored(stub, id).storedJob.result.result);
});

// --- 4. the final whole-branch gate -----------------------------------------

test('every lens of the final gate after the task gate gets approve, with no finding', () => {
  const stub = newStub();
  const seen = taskRoundOne(stub);
  review(stub, reReviewFocus());
  seen.push(captureNewestId(stub));
  for (const lens of FINAL_LENSES) {
    expect(review(stub, finalFocus(lens))).toBe(APPROVE_STDOUT);
    const id = captureNewestId(stub);
    expect(seen).not.toContain(id);
    seen.push(id);
    expectApprove(stored(stub, id).storedJob.result.result);
  }
});

// --- 5. payload bytes -------------------------------------------------------

test('the finding and approve payloads are byte-identical to the 1889827 stub', () => {
  for (const sub of ['adversarial-review', 'review', 'task-reviewer']) {
    const stub = newStub();
    for (const [focus, expected] of [
      [roundOneFocus('correctness'), FINDING_STDOUT],
      [reReviewFocus(), APPROVE_STDOUT],
      [finalFocus('correctness'), APPROVE_STDOUT],
    ] as const) {
      expect(review(stub, focus, sub)).toBe(expected);
      const id = captureNewestId(stub);
      expect(stored(stub, id)).toEqual({
        job: { id, jobClass: 'review', status: 'completed' },
        storedJob: {
          result: { result: JSON.parse(expected), rawOutput: expected },
        },
      });
    }
  }
});
