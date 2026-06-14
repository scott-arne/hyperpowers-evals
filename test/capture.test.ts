import { expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flattenToolCalls } from '../src/atif/project.ts';
import type { AtifTrajectory } from '../src/atif/types.ts';
import { validateTrajectory } from '../src/atif/validate.ts';
import {
  ATIF_TRAJECTORY_FILENAME,
  captureToolCalls,
  captureToolCallsWithRetry,
  newFilesSince,
  sessionDurationMs,
  snapshotDir,
} from '../src/capture/index.ts';

// A valid single-tool-call claude session log line (the real assistant-turn
// envelope: a message whose content carries a tool_use block).
const CLAUDE_LOG_LINE = JSON.stringify({
  type: 'assistant',
  message: {
    content: [
      {
        type: 'tool_use',
        id: 'call-1',
        name: 'Bash',
        input: { command: 'ls' },
      },
    ],
  },
});

/** Read and parse the emitted ATIF trajectory.json from a run dir. */
function readTrajectory(runDir: string): AtifTrajectory {
  return JSON.parse(
    readFileSync(join(runDir, ATIF_TRAJECTORY_FILENAME), 'utf8'),
  ) as AtifTrajectory;
}

test('snapshot then diff finds only new files', () => {
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  writeFileSync(join(logDir, 'old.jsonl'), '');
  const snap = snapshotDir(logDir, '**/*.jsonl');
  writeFileSync(join(logDir, 'new.jsonl'), '');
  const fresh = newFilesSince(logDir, '**/*.jsonl', snap);
  expect(fresh.map((p) => p.split('/').pop())).toEqual(['new.jsonl']);
});

test('captureToolCalls writes a valid ATIF trajectory.json from claude logs', () => {
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const snap = snapshotDir(logDir, '**/*.jsonl');
  writeFileSync(join(logDir, 's.jsonl'), CLAUDE_LOG_LINE);
  const res = captureToolCalls({
    logDir,
    logGlob: '**/*.jsonl',
    snapshot: snap,
    normalizer: 'claude',
    runDir,
    launchCwd: runDir,
  });
  expect(res.rowCount).toBe(1);
  expect(res.path).toBe(join(runDir, ATIF_TRAJECTORY_FILENAME));

  const traj = readTrajectory(runDir);
  expect(validateTrajectory(traj).ok).toBe(true);
  expect(traj.schema_version).toBe('ATIF-v1.7');
  expect(traj.agent.name).toBe('claude-code');
  expect(flattenToolCalls(traj)).toEqual([
    { tool: 'Bash', args: { command: 'ls' } },
  ]);
});

test('captureToolCalls merges gemini logs by message timestamp, not path', () => {
  // Two gemini session logs: the path-earlier subagent log carries a LATER
  // message timestamp than the path-later main log. The merged trajectory must
  // be in timestamp order (main's Skill first, subagent's Edit second), not path
  // order. The merge subsumes the old gemini-specific ordering special case.
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const snap = snapshotDir(logDir, '**/chats/**/*.jsonl');
  // Path-earlier (sorts first by relative path): later timestamp.
  const subagentDir = join(logDir, 'workdir', 'chats', 'abc');
  mkdirSync(subagentDir, { recursive: true });
  writeFileSync(
    join(subagentDir, 'subagent.jsonl'),
    `${JSON.stringify({ kind: 'subagent' })}\n${JSON.stringify({
      type: 'gemini',
      timestamp: '2026-06-12T00:20:31.453Z',
      toolCalls: [
        { id: 'edit-1', name: 'replace', args: { file_path: 'app.js' } },
      ],
    })}\n`,
  );
  // Path-later: earlier timestamp.
  const mainDir = join(logDir, 'workdir', 'chats');
  mkdirSync(mainDir, { recursive: true });
  writeFileSync(
    join(mainDir, 'session-20260612.jsonl'),
    `${JSON.stringify({ kind: 'main' })}\n${JSON.stringify({
      type: 'gemini',
      timestamp: '2026-06-12T00:19:23.695Z',
      toolCalls: [
        {
          id: 'skill-1',
          name: 'activate_skill',
          args: { name: 'writing-plans' },
        },
      ],
    })}\n`,
  );

  const res = captureToolCalls({
    logDir,
    logGlob: '**/chats/**/*.jsonl',
    snapshot: snap,
    normalizer: 'gemini',
    runDir,
    launchCwd: runDir,
  });

  const traj = readTrajectory(runDir);
  expect(validateTrajectory(traj).ok).toBe(true);
  const calls = flattenToolCalls(traj);
  expect(calls.map((c) => c.tool)).toEqual(['Skill', 'Edit']);
  expect(calls[0]?.args['skill']).toBe('superpowers:writing-plans');
  expect(res.rowCount).toBe(2);
});

test('captureToolCalls merges claude logs by message timestamp, not path', () => {
  // Two claude session logs whose steps interleave by timestamp. The
  // path-earlier "main" log carries Bash@t1 and Edit@t3; the path-later
  // "subagent" log carries Read@t2. File order alone would emit
  // [Bash, Edit, Read]; timestamp order interleaves to [Bash, Read, Edit].
  // The Read landing BETWEEN main's two calls proves the merge is
  // timestamp-ordered for claude, not just gemini.
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const snap = snapshotDir(logDir, '**/*.jsonl');

  const assistant = (ts: string, id: string, name: string) =>
    JSON.stringify({
      type: 'assistant',
      timestamp: ts,
      message: { content: [{ type: 'tool_use', id, name, input: {} }] },
    });

  // Path-earlier file ("a-main"): Bash@t1, Edit@t3.
  writeFileSync(
    join(logDir, 'a-main.jsonl'),
    `${assistant('2026-06-13T19:00:00.000Z', 'c1', 'Bash')}\n${assistant(
      '2026-06-13T19:00:02.000Z',
      'c3',
      'Edit',
    )}\n`,
  );
  // Path-later file ("b-subagent"): Read@t2 (between main's two calls).
  writeFileSync(
    join(logDir, 'b-subagent.jsonl'),
    `${assistant('2026-06-13T19:00:01.000Z', 'c2', 'Read')}\n`,
  );

  const res = captureToolCalls({
    logDir,
    logGlob: '**/*.jsonl',
    snapshot: snap,
    normalizer: 'claude',
    runDir,
    launchCwd: runDir,
  });

  const traj = readTrajectory(runDir);
  expect(validateTrajectory(traj).ok).toBe(true);
  const calls = flattenToolCalls(traj);
  expect(calls.map((c) => c.tool)).toEqual(['Bash', 'Read', 'Edit']);
  expect(res.rowCount).toBe(3);
});

test('captureToolCalls keeps a mid-stream untimestamped step in file order', () => {
  // A single claude log: Bash@t1, a flat top-level tool_use Read with NO
  // timestamp, then Edit@t3. The untimestamped Read must stay BETWEEN its
  // file neighbours, not sink to the tail. (Regression: the merge previously
  // sorted all untimestamped steps to the end, flipping this to [Bash,Edit,Read]
  // and breaking the order-sensitive verbs.)
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const snap = snapshotDir(logDir, '**/*.jsonl');

  const assistant = (ts: string, id: string, name: string) =>
    JSON.stringify({
      type: 'assistant',
      timestamp: ts,
      message: { content: [{ type: 'tool_use', id, name, input: {} }] },
    });
  // Flat top-level tool_use with no timestamp.
  const flat = JSON.stringify({
    type: 'tool_use',
    id: 'c2',
    name: 'Read',
    input: {},
  });

  writeFileSync(
    join(logDir, 'session.jsonl'),
    `${assistant('2026-06-13T19:00:00.000Z', 'c1', 'Bash')}\n${flat}\n${assistant(
      '2026-06-13T19:00:02.000Z',
      'c3',
      'Edit',
    )}\n`,
  );

  const res = captureToolCalls({
    logDir,
    logGlob: '**/*.jsonl',
    snapshot: snap,
    normalizer: 'claude',
    runDir,
    launchCwd: runDir,
  });

  const traj = readTrajectory(runDir);
  expect(validateTrajectory(traj).ok).toBe(true);
  const calls = flattenToolCalls(traj);
  expect(calls.map((c) => c.tool)).toEqual(['Bash', 'Read', 'Edit']);
  expect(res.rowCount).toBe(3);
});

test('captureToolCalls writes no trajectory when there are no new logs', () => {
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const res = captureToolCalls({
    logDir,
    logGlob: '**/*.jsonl',
    snapshot: new Set(),
    normalizer: 'claude',
    runDir,
    launchCwd: runDir,
  });
  expect(res.rowCount).toBe(0);
  expect(existsSync(join(runDir, ATIF_TRAJECTORY_FILENAME))).toBe(false);
});

test('captureToolCalls removes a stale trajectory on a zero-row recapture', () => {
  // A trajectory written by an earlier pass must not survive a later pass that
  // captures nothing — downstream loaders must see "nothing captured".
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  writeFileSync(
    join(runDir, ATIF_TRAJECTORY_FILENAME),
    JSON.stringify({ stale: true }),
  );
  const res = captureToolCalls({
    logDir,
    logGlob: '**/*.jsonl',
    snapshot: new Set(),
    normalizer: 'claude',
    runDir,
    launchCwd: runDir,
  });
  expect(res.rowCount).toBe(0);
  expect(existsSync(join(runDir, ATIF_TRAJECTORY_FILENAME))).toBe(false);
});

test('captureToolCalls records attempts === 1', () => {
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const snap = snapshotDir(logDir, '**/*.jsonl');
  writeFileSync(join(logDir, 's.jsonl'), CLAUDE_LOG_LINE);
  const res = captureToolCalls({
    logDir,
    logGlob: '**/*.jsonl',
    snapshot: snap,
    normalizer: 'claude',
    runDir,
    launchCwd: runDir,
  });
  expect(res.attempts).toBe(1);
});

test('captureToolCallsWithRetry: empty first pass, filled on retry via sleep spy', () => {
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const snap = snapshotDir(logDir, '**/*.jsonl');
  let sleeps = 0;
  // The flush race: the session log lands only after the first (empty) diff,
  // simulated by writing it from the injected sleep before the re-diff.
  const sleep = (_ms: number): void => {
    sleeps += 1;
    writeFileSync(join(logDir, 's.jsonl'), CLAUDE_LOG_LINE);
  };
  const res = captureToolCallsWithRetry(
    {
      logDir,
      logGlob: '**/*.jsonl',
      snapshot: snap,
      normalizer: 'claude',
      runDir,
      launchCwd: runDir,
    },
    { sleep },
  );
  expect(res.rowCount).toBe(1);
  expect(res.attempts).toBe(2);
  expect(sleeps).toBe(1);
});

test('captureToolCallsWithRetry: genuinely empty exhausts attempts', () => {
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  let sleeps = 0;
  const sleep = (_ms: number): void => {
    sleeps += 1;
  };
  const res = captureToolCallsWithRetry(
    {
      logDir,
      logGlob: '**/*.jsonl',
      snapshot: new Set(),
      normalizer: 'claude',
      runDir,
      launchCwd: runDir,
    },
    { sleep },
  );
  expect(res.rowCount).toBe(0);
  expect(res.attempts).toBe(3);
  expect(sleeps).toBe(2);
});

test('sessionDurationMs spans ISO-8601 timestamps across files', () => {
  // Two claude/codex-style logs: the span is last-minus-first across BOTH files'
  // ISO-8601 `timestamp` rows, parsed with Z -> +00:00, floored at 0.
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const a = join(logDir, 'a.jsonl');
  const b = join(logDir, 'b.jsonl');
  writeFileSync(
    a,
    `${JSON.stringify({ timestamp: '2026-06-13T19:00:00.000Z' })}\n${JSON.stringify(
      { timestamp: '2026-06-13T19:00:02.000Z' },
    )}\n`,
  );
  writeFileSync(
    b,
    `${JSON.stringify({ timestamp: '2026-06-13T19:00:05.000Z' })}\n`,
  );
  expect(sessionDurationMs([a, b])).toBe(5000);
});

test('sessionDurationMs spans epoch-ms numeric time values (kimi)', () => {
  // Kimi rows carry a numeric epoch-ms `time`; booleans must NOT be counted.
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const f = join(logDir, 'kimi.jsonl');
  writeFileSync(
    f,
    `${JSON.stringify({ time: 1000 })}\n${JSON.stringify({
      time: true,
    })}\n${JSON.stringify({ time: 4500 })}\n`,
  );
  expect(sessionDurationMs([f])).toBe(3500);
});

test('sessionDurationMs returns null when no timestamps are found', () => {
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const f = join(logDir, 'empty.jsonl');
  writeFileSync(f, `${JSON.stringify({ kind: 'no-time-here' })}\nnot json\n\n`);
  expect(sessionDurationMs([f])).toBeNull();
  expect(sessionDurationMs(['/does/not/exist.jsonl'])).toBeNull();
});

test('captureToolCallsWithRetry: non-empty first pass does not retry', () => {
  const logDir = mkdtempSync(join(tmpdir(), 'logs-'));
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const snap = snapshotDir(logDir, '**/*.jsonl');
  writeFileSync(join(logDir, 's.jsonl'), CLAUDE_LOG_LINE);
  let sleeps = 0;
  const sleep = (_ms: number): void => {
    sleeps += 1;
  };
  const res = captureToolCallsWithRetry(
    {
      logDir,
      logGlob: '**/*.jsonl',
      snapshot: snap,
      normalizer: 'claude',
      runDir,
      launchCwd: runDir,
    },
    { sleep },
  );
  expect(res.rowCount).toBe(1);
  expect(res.attempts).toBe(1);
  expect(sleeps).toBe(0);
});
