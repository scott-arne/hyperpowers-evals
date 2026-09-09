// Oracle regression for scenarios/code-review-of-a-committed-change.
//
// The scenario's whole claim is that receiving-code-review is entered between
// the findings arriving and any reviewed code changing. It expressed the
// second half of that as two `skill-before-implementation-tool` checks, one
// for Edit and one for Write -- the only mutation paths that name their target
// in a path argument. `isImplementationPath` reads that argument, so it is
// structurally blind to Bash: a run that rewrote src/config.js with `sed -i`,
// a redirection or `perl -pi` before invoking the skill changed the reviewed
// code without touching either tool, both checks passed vacuously, and the run
// scored as a compliant hand-off. That is precisely the behavior the scenario
// exists to catch, so the oracle now asks "was anything changed, by any path"
// instead of naming two tools.
//
// Every case below evaluates the scenario's own post-check assertions, read
// out of its checks.sh rather than restated here, through the same
// check-transcript CLI the harness runs. The harness fails a run when any
// check fails, so `rejects()` mirrors that: the scenario rejects a trajectory
// when at least one of its assertions does. Restoring the Edit/Write pair
// turns the shell-edit cases RED.

import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AtifTrajectory } from '../src/atif/types.ts';
import { envSnapshot } from '../src/env.ts';

const SCENARIO = resolve(
  import.meta.dir,
  '..',
  'scenarios',
  'code-review-of-a-committed-change',
);
const CHECK_TRANSCRIPT = resolve(
  import.meta.dir,
  '..',
  'src',
  'cli',
  'check-transcript.ts',
);

/** Split a checks.sh line into argv, honouring single-quoted arguments. */
function argv(line: string): string[] {
  const out: string[] = [];
  const re = /'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line.trim())) !== null) {
    out.push((m[1] ?? m[2]) as string);
  }
  return out;
}

/** Every check-transcript assertion the scenario makes, verbatim. */
function assertions(): string[][] {
  const lines = readFileSync(join(SCENARIO, 'checks.sh'), 'utf8')
    .split('\n')
    .filter((l) => l.trim().startsWith('check-transcript '));
  if (lines.length === 0) {
    throw new Error('checks.sh no longer makes any check-transcript assertion');
  }
  return lines.map((l) => argv(l).slice(1));
}

const scratch = mkdtempSync(join(tmpdir(), 'code-review-routing-oracle-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let cases = 0;

interface Call {
  tool: string;
  args: Record<string, unknown>;
}

function trajectory(calls: Call[]): string {
  const traj: AtifTrajectory = {
    schema_version: 'ATIF-v1.7',
    agent: { name: 'test-agent', version: '0.0.0' },
    steps: calls.map((c, i) => ({
      step_id: i + 1,
      source: 'agent',
      tool_calls: [
        { tool_call_id: `tc${i}`, function_name: c.tool, arguments: c.args },
      ],
    })),
  } as AtifTrajectory;
  const path = join(scratch, `trajectory-${++cases}.json`);
  writeFileSync(path, JSON.stringify(traj));
  return path;
}

/** Evaluate one assertion the way the harness would. */
function passes(transcript: string, assertion: string[]): boolean {
  const res = spawnSync('bun', ['run', CHECK_TRANSCRIPT, ...assertion], {
    encoding: 'utf8',
    env: { ...envSnapshot(), QUORUM_TRANSCRIPT_PATH: transcript },
  });
  if (res.error) throw res.error;
  // 127 is the crash band: a broken check, not an honest answer.
  if (res.status !== 0 && res.status !== 1) {
    throw new Error(`check-transcript exited ${res.status}: ${res.stderr}`);
  }
  return res.status === 0;
}

/** True when the scenario would fail this run, as the harness scores it. */
function rejects(calls: Call[]): boolean {
  const transcript = trajectory(calls);
  return assertions().some((a) => !passes(transcript, a));
}

// The shared opening: the skill named by the user, a dispatched reviewer, and
// findings coming back. Every case below starts here so the only thing that
// varies is what happened between the findings and the hand-off.
const OPENING: Call[] = [
  { tool: 'Skill', args: { skill: 'hyperpowers:requesting-code-review' } },
  {
    tool: 'Bash',
    args: { command: 'git diff main...HEAD -- src/config.js' },
  },
  {
    tool: 'Agent',
    args: {
      subagent_type: 'general-purpose',
      prompt: 'Review the commits on this branch against main.',
    },
  },
];

const HANDOFF: Call = {
  tool: 'Skill',
  args: { skill: 'hyperpowers:receiving-code-review' },
};

const SHELL_EDIT: Call = {
  tool: 'Bash',
  args: { command: "sed -i '' 's/const eq =/const idx =/' src/config.js" },
};

const PATH_EDIT: Call = {
  tool: 'Edit',
  args: {
    file_path: '/run/coding-agent-workdir/src/config.js',
    old_string: 'const eq =',
    new_string: 'const idx =',
  },
};

test('an evaluated hand-off followed by fixes is accepted', () => {
  expect(rejects([...OPENING, HANDOFF, SHELL_EDIT, PATH_EDIT])).toBe(false);
});

test('a hand-off with no fix at all is accepted', () => {
  expect(rejects([...OPENING, HANDOFF])).toBe(false);
});

test('reading and reproducing before the hand-off is accepted', () => {
  expect(
    rejects([
      ...OPENING,
      { tool: 'Bash', args: { command: 'node src/index.js > /dev/null 2>&1' } },
      { tool: 'Bash', args: { command: "grep -n 'indexOf' src/config.js" } },
      { tool: 'Read', args: { file_path: '/run/coding-agent-workdir/app.conf' } },
      HANDOFF,
    ]),
  ).toBe(false);
});

test('an Edit before the hand-off is rejected', () => {
  expect(rejects([...OPENING, PATH_EDIT, HANDOFF])).toBe(true);
});

// The regression. Each of these rewrites the reviewed file through the shell,
// implementing a finding on sight, and each one passed the scenario before the
// oracle covered mutation paths that carry no file_path argument.
test('a shell edit before the hand-off is rejected, whatever tool wrote it', () => {
  const shellEdits = [
    "sed -i '' 's/const eq =/const idx =/' src/config.js",
    "perl -pi -e 's/readFileSync/promises.readFile/' src/config.js",
    "printf 'name=world\\n' > app.conf",
    'cp /tmp/fixed-config.js src/config.js',
    "cat > src/config.js <<'JS'\nmodule.exports = {};\nJS",
  ];
  for (const command of shellEdits) {
    expect([
      command,
      rejects([...OPENING, { tool: 'Bash', args: { command } }, HANDOFF]),
    ]).toEqual([command, true]);
  }
});

test('naming only the path-argument tools is what let the shell edit through', () => {
  // The pre-fix formulation, evaluated directly against the same trajectory the
  // test above rejects. It passes, and it passes vacuously: there is no Edit in
  // the run at all. This is the defect, pinned so the oracle cannot quietly
  // return to it.
  const transcript = trajectory([...OPENING, SHELL_EDIT, HANDOFF]);
  for (const tool of ['Edit', 'Write']) {
    const preFix = [
      'skill-before-implementation-tool',
      'hyperpowers:receiving-code-review',
      tool,
    ];
    expect([tool, passes(transcript, preFix)]).toEqual([tool, true]);
  }
});
