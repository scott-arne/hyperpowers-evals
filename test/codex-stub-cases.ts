import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// One observation of the approve-stub: what its last call printed and exited
// with, and what the case's calls left beside it (calls.log and .jobs/). The
// golden file records these for the stub as it stood in the eight setup.sh
// heredocs; the shared fixture must reproduce every one. Each case runs in its
// own directory, whose path is replaced by <DIR> so the record is portable.
export interface StubCase {
  readonly name: string;
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly log: string;
  readonly jobs: Record<string, string>;
}

// One prompt per branch of the stub's classify().
const PROMPTS = {
  approaches:
    'Read approach-context.md and return Approaches (2-3, each genuinely different).',
  'plan-review':
    'Review the implementation plan at /tmp/x/plan.md against the spec.',
  'spec-review':
    'Review the spec document at /tmp/x/2026-01-01-foo-design.md for completeness.',
  'document-review': 'Review the document at /tmp/x/notes.md and report.',
} as const;
type Kind = keyof typeof PROMPTS;

function promptFile(dir: string, kind: Kind): string {
  const file = join(dir, `${kind}.prompt.md`);
  writeFileSync(file, PROMPTS[kind]);
  return file;
}

function emptyFile(dir: string): string {
  const file = join(dir, 'empty.prompt.md');
  writeFileSync(file, '');
  return file;
}

const ZEROS = '0'.repeat(40);
const CASES: ReadonlyArray<{
  readonly name: string;
  readonly calls: (dir: string) => string[][];
}> = [
  { name: 'setup --json', calls: () => [['setup', '--json']] },
  ...(Object.keys(PROMPTS) as Kind[]).flatMap((kind) => [
    {
      name: `task ${kind}`,
      calls: (d: string) => [
        ['task', '--fresh', '--prompt-file', promptFile(d, kind)],
      ],
    },
    {
      name: `task ${kind} --json`,
      calls: (d: string) => [
        ['task', '--fresh', '--prompt-file', promptFile(d, kind), '--json'],
      ],
    },
  ]),
  {
    name: 'task with a missing prompt file',
    calls: (d) => [
      ['task', '--fresh', '--prompt-file', join(d, 'missing.prompt.md')],
    ],
  },
  {
    name: 'task with an empty prompt file',
    calls: (d) => [['task', '--fresh', '--prompt-file', emptyFile(d)]],
  },
  { name: 'task with no prompt', calls: () => [['task', '--fresh']] },
  { name: 'task-reviewer', calls: () => [['task-reviewer', '--json']] },
  { name: 'review', calls: () => [['review', '--json']] },
  {
    name: 'adversarial-review',
    calls: () => [['adversarial-review', '--base', ZEROS, '--json', 'focus']],
  },
  { name: 'status --json', calls: () => [['status', '--json']] },
  {
    name: 'status <id> after a review',
    calls: () => [
      ['adversarial-review', '--base', ZEROS, '--json', 'focus'],
      ['status', 'cxc-stub-1', '--json'],
    ],
  },
  {
    name: 'status <unknown id>',
    calls: () => [['status', 'cxc-stub-9', '--json']],
  },
  {
    name: 'result <id> after a review',
    calls: () => [
      ['adversarial-review', '--base', ZEROS, '--json', 'focus'],
      ['result', 'cxc-stub-1', '--json'],
    ],
  },
  {
    name: 'result <unknown id>',
    calls: () => [['result', 'cxc-stub-9', '--json']],
  },
  { name: 'an unknown subcommand', calls: () => [['frobnicate']] },
];

export function runStubCases(stubFile: string): StubCase[] {
  return CASES.map((c) => {
    const dir = mkdtempSync(join(tmpdir(), 'codex-stub-case-'));
    try {
      const stub = join(dir, 'codex-companion.mjs');
      copyFileSync(stubFile, stub);
      let last = { status: null as number | null, stdout: '', stderr: '' };
      for (const args of c.calls(dir)) {
        const r = spawnSync('node', [stub, ...args], { encoding: 'utf8' });
        last = { status: r.status, stdout: r.stdout, stderr: r.stderr };
      }
      // The stub may see its own path through the real path (macOS /private).
      const portable = (s: string) =>
        s.split(realpathSync(dir)).join('<DIR>').split(dir).join('<DIR>');
      const logFile = join(dir, 'calls.log');
      const jobsDir = join(dir, '.jobs');
      const jobs: Record<string, string> = {};
      if (existsSync(jobsDir)) {
        for (const f of readdirSync(jobsDir).sort()) {
          jobs[f] = portable(readFileSync(join(jobsDir, f), 'utf8'));
        }
      }
      return {
        name: c.name,
        status: last.status,
        stdout: portable(last.stdout),
        stderr: portable(last.stderr),
        log: existsSync(logFile) ? portable(readFileSync(logFile, 'utf8')) : '',
        jobs,
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
