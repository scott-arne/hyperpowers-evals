import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Seven brainstorming scenarios seed a Codex companion stub for the approach
// and spec gates, which call the companion's `task` subcommand; the stubs
// answered task-reviewer/review/adversarial-review only (and `{}` to task),
// so those gates ran a degraded path. Each stub must now answer `task`
// exactly as the reference stub (brainstorming-asks-tooling-question) does,
// for every classification, and its other subcommands must be unchanged.

const SCENARIOS = resolve(import.meta.dir, '..', 'scenarios');
const REFERENCE = 'brainstorming-asks-tooling-question';
const PORTED = [
  'brainstorming-bounded-fires-approach-gate',
  'brainstorming-router-escalates-b1-userid-param',
  'brainstorming-router-escalates-b2-config-module',
  'brainstorming-router-escalates-b3-logging',
  'brainstorming-router-escalates-b4-reusable-validation',
  'brainstorming-router-escalates-b5-prefs-storage',
  'brainstorming-router-no-downgrade',
];
// One prompt per branch of the reference's classify(): approaches wins on
// approach-context.md, plan-review on "implementation plan", spec-review on
// "-design.md", anything else is document-review.
const PROMPTS: Record<string, string> = {
  approaches:
    'Read approach-context.md and return Approaches (2-3, each genuinely different).',
  'plan-review':
    'Review the implementation plan at /tmp/x/plan.md against the spec.',
  'spec-review':
    'Review the spec document at /tmp/x/2026-01-01-foo-design.md for completeness.',
  'document-review': 'Review the document at /tmp/x/notes.md and report.',
};
// Outputs at the base commit (recorded 2026-10-05, identical across the
// seven), written without a trailing newline. The port must not change them.
const STATUS_BEFORE = '{"running":[],"latestFinished":null,"recent":[]}';
const REVIEW_BEFORE =
  '{"verdict":"approve","summary":"Stub: always approve, no findings.","findings":[],"next_steps":[]}';

const root = mkdtempSync(join(tmpdir(), 'stub-task-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function stubSource(scenario: string): string {
  const setup = readFileSync(join(SCENARIOS, scenario, 'setup.sh'), 'utf8');
  const m = /codex-companion\.mjs" <<'STUB'\n([\s\S]*?)\nSTUB\n/.exec(setup);
  if (m === null)
    throw new Error(`${scenario}: no codex-companion.mjs heredoc`);
  return m[1] as string;
}

function installStub(scenario: string, tag: string): string {
  const dir = join(root, `${scenario}-${tag}`);
  mkdirSync(dir, { recursive: true });
  const stub = join(dir, 'codex-companion.mjs');
  writeFileSync(stub, `${stubSource(scenario)}\n`);
  return stub;
}

function run(
  stub: string,
  args: string[],
): { status: number | null; stdout: string } {
  const r = spawnSync('node', [stub, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout };
}

function promptFile(kind: string): string {
  const file = join(root, `${kind}.prompt.md`);
  writeFileSync(file, PROMPTS[kind] as string);
  return file;
}

for (const kind of Object.keys(PROMPTS)) {
  test(`every ported stub answers task (${kind}) exactly as the reference`, () => {
    const want = run(installStub(REFERENCE, kind), [
      'task',
      '--fresh',
      '--prompt-file',
      promptFile(kind),
    ]);
    expect(want.status).toBe(0);
    expect(want.stdout.length).toBeGreaterThan(2);
    const wantJson = run(installStub(REFERENCE, `${kind}-json`), [
      'task',
      '--fresh',
      '--prompt-file',
      promptFile(kind),
      '--json',
    ]);
    for (const scenario of PORTED) {
      const got = run(installStub(scenario, kind), [
        'task',
        '--fresh',
        '--prompt-file',
        promptFile(kind),
      ]);
      expect(got).toEqual(want);
      const gotJson = run(installStub(scenario, `${kind}-json`), [
        'task',
        '--fresh',
        '--prompt-file',
        promptFile(kind),
        '--json',
      ]);
      expect(gotJson).toEqual(wantJson);
    }
  });
}

test('the other subcommands are unchanged by the port', () => {
  for (const scenario of PORTED) {
    expect(run(installStub(scenario, 'status'), ['status', '--json'])).toEqual({
      status: 0,
      stdout: STATUS_BEFORE,
    });
    expect(
      run(installStub(scenario, 'review'), [
        'adversarial-review',
        '--base',
        '0'.repeat(40),
        '--json',
        'focus',
      ]),
    ).toEqual({ status: 0, stdout: REVIEW_BEFORE });
  }
});
