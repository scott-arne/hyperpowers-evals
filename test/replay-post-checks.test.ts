import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cloneWorkspace,
  eligibleRuns,
  hashTree,
} from '../src/cli/replay-post-checks.ts';
import type { CheckRecord, FinalVerdict } from '../src/contracts/verdict.ts';

const root = mkdtempSync(join(tmpdir(), 'replay-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const git = (cwd: string, args: string[]) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout;
};
const AGENTS = ['claude-auto'];

// Schema-valid verdict fixtures: FinalVerdictSchema requires schema, final,
// final_reason, gauntlet, checks, error, economics; each check record needs
// detail and phase.
function record(
  check: string,
  passed: boolean,
  phase: 'pre' | 'post',
  args: string[] = [],
): CheckRecord {
  return { check, args, negated: false, passed, detail: null, phase };
}
function verdictFixture(over: Partial<FinalVerdict>): FinalVerdict {
  return {
    schema: 1,
    final: 'pass',
    final_reason: 'fixture',
    gauntlet: null,
    checks: [],
    error: null,
    economics: null,
    ...over,
  };
}
function scenariosRootWith(...names: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'scenarios-'));
  for (const n of names) {
    mkdirSync(join(dir, n));
    writeFileSync(join(dir, n, 'story.md'), '---\nid: x\n---\n');
  }
  return dir;
}

// A legacy-layout run whose workspace has a linked worktree sibling, an
// intra-source absolute symlink, and an external absolute symlink — the three
// pointer classes the clone must handle.
function recordedWorktreeRun(): {
  resultsRoot: string;
  runDir: string;
  external: string;
} {
  const resultsRoot = join(root, 'results');
  const runDir = join(
    resultsRoot,
    'worktree-no-drift-to-main-claude-auto-20260101T000000Z-aaaa',
  );
  const wd = join(runDir, 'coding-agent-workdir');
  mkdirSync(wd, { recursive: true });
  git(wd, ['init', '-q', '-b', 'main']);
  git(wd, ['config', 'user.email', 'a@b']);
  git(wd, ['config', 'user.name', 't']);
  writeFileSync(join(wd, 'f.txt'), 'x\n');
  git(wd, ['add', '-A']);
  git(wd, ['commit', '-qm', 'init']);
  git(wd, [
    'worktree',
    'add',
    '-q',
    join(runDir, 'coding-agent-workdir-existing-worktree'),
    '-b',
    'feature',
  ]);
  mkdirSync(join(runDir, 'home', '.local', 'bin'), { recursive: true });
  mkdirSync(
    join(runDir, 'home', '.local', 'share', 'claude', 'versions', '1.0'),
    { recursive: true },
  );
  symlinkSync(
    join(runDir, 'home', '.local', 'share', 'claude', 'versions', '1.0'),
    join(runDir, 'home', '.local', 'bin', 'claude'),
  );
  const external = mkdtempSync(join(tmpdir(), 'external-'));
  symlinkSync(external, join(runDir, 'home', 'external-link'));
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  return { resultsRoot, runDir, external };
}

test('cloneWorkspace repairs worktree pointers inside the arm and leaves the source untouched', () => {
  const { resultsRoot, runDir, external } = recordedWorktreeRun();
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-no-drift-to-main'),
    AGENTS,
  );
  expect(eligible).toHaveLength(1);
  const dest = join(root, 'armL');
  const report = cloneWorkspace(eligible[0]!, dest);
  // Git pointers resolve inside the arm, in both directions.
  const gitdir = readFileSync(
    join(
      dest,
      'coding-agent-workdir',
      '.git',
      'worktrees',
      'coding-agent-workdir-existing-worktree',
      'gitdir',
    ),
    'utf8',
  ).trim();
  expect(gitdir.startsWith(realpathSync(dest))).toBe(true);
  const dotgit = readFileSync(
    join(dest, 'coding-agent-workdir-existing-worktree', '.git'),
    'utf8',
  ).trim();
  expect(dotgit.replace(/^gitdir: /, '').startsWith(realpathSync(dest))).toBe(
    true,
  );
  // The intra-source symlink was rewritten to the arm; the external one kept and listed.
  expect(
    readlinkSync(join(dest, 'home', '.local', 'bin', 'claude')).startsWith(
      realpathSync(dest),
    ),
  ).toBe(true);
  expect(readlinkSync(join(dest, 'home', 'external-link'))).toBe(external);
  expect(report.externalReferences).toContain(
    join(dest, 'home', 'external-link'),
  );
  expect(report.rewrittenSymlinks).toHaveLength(1);
  // The source is byte-identical, pointers included.
  expect(hashTree(runDir)).toBe(before);
  expect(
    git(join(dest, 'coding-agent-workdir'), ['worktree', 'list']),
  ).toContain(realpathSync(dest));
});

test('eligibleRuns demotes a setup-stage verdict, a stripped workspace and a scenario with no run, each with its reason', () => {
  const resultsRoot = join(root, 'results2');
  const a = join(resultsRoot, 'alpha-claude-auto-20260101T000000Z-0001');
  mkdirSync(join(a, 'coding-agent-workdir'), { recursive: true });
  writeFileSync(
    join(a, 'verdict.json'),
    JSON.stringify(
      verdictFixture({
        final: 'indeterminate',
        error: { stage: 'setup', message: 'x' },
      }),
    ),
  );
  const b = join(resultsRoot, 'beta-claude-auto-20260101T000000Z-0002');
  mkdirSync(b, { recursive: true }); // no workdir at all
  writeFileSync(
    join(b, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('file-exists', true, 'post', ['x'])] }),
    ),
  );
  const { eligible, ineligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('alpha', 'beta', 'gamma'),
    AGENTS,
  );
  expect(eligible).toHaveLength(0);
  expect(ineligible.map((i) => [i.scenario, i.reason])).toEqual(
    expect.arrayContaining([
      ['alpha', 'setup-stage-verdict'],
      ['beta', 'stripped-workspace'],
      ['gamma', 'no-run'],
    ]),
  );
});

test('eligibleRuns: a newest run without post records yields to an older eligible run; a scenario with only such runs demotes as no-post-records', () => {
  const resultsRoot = join(root, 'results4');
  const newer = join(resultsRoot, 'delta-claude-auto-20260102T000000Z-0005');
  const older = join(resultsRoot, 'delta-claude-auto-20260101T000000Z-0004');
  for (const d of [newer, older])
    mkdirSync(join(d, 'coding-agent-workdir'), { recursive: true });
  writeFileSync(
    join(newer, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('file-exists', true, 'pre', ['x'])] }),
    ),
  );
  writeFileSync(
    join(older, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('file-exists', true, 'post', ['x'])] }),
    ),
  );
  const only = join(resultsRoot, 'epsilon-claude-auto-20260101T000000Z-0006');
  mkdirSync(join(only, 'coding-agent-workdir'), { recursive: true });
  writeFileSync(
    join(only, 'verdict.json'),
    JSON.stringify(verdictFixture({ checks: [] })),
  );
  const { eligible, ineligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('delta', 'epsilon'),
    AGENTS,
  );
  expect(eligible.map((e) => e.runId)).toEqual([
    'delta-claude-auto-20260101T000000Z-0004',
  ]);
  expect(ineligible.map((i) => [i.scenario, i.reason])).toEqual([
    ['epsilon', 'no-post-records'],
  ]);
});

test('a relocated run is cloned from results/workspaces/<run>, and its record stays out of the arm', () => {
  const resultsRoot = join(root, 'results5');
  const runId = 'zeta-claude-auto-20260101T000000Z-0007';
  const workspaceRoot = join(resultsRoot, 'workspaces', runId);
  mkdirSync(join(workspaceRoot, 'coding-agent-workdir'), { recursive: true });
  writeFileSync(join(workspaceRoot, 'coding-agent-workdir', 'f.txt'), 'x\n');
  writeFileSync(join(workspaceRoot, 'package.json'), '{}\n');
  mkdirSync(join(resultsRoot, runId), { recursive: true });
  writeFileSync(
    join(resultsRoot, runId, 'verdict.json'),
    JSON.stringify(
      verdictFixture({
        checks: [record('file-exists', true, 'post', ['f.txt'])],
      }),
    ),
  );
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('zeta'),
    AGENTS,
  );
  expect(eligible.map((e) => [e.layout, e.workspaceRoot, e.runDir])).toEqual([
    ['relocated', workspaceRoot, join(resultsRoot, runId)],
  ]);
  const dest = join(root, 'armR');
  expect(cloneWorkspace(eligible[0]!, dest)).toEqual({
    gitPointers: [],
    rewrittenSymlinks: [],
    externalReferences: [],
  });
  expect(
    readFileSync(join(dest, 'coding-agent-workdir', 'f.txt'), 'utf8'),
  ).toBe('x\n');
  expect(existsSync(join(dest, 'verdict.json'))).toBe(false);
});

test('cloneWorkspace refuses an arm it cannot make self-contained', () => {
  const resultsRoot = join(root, 'results6');
  const runId = 'eta-claude-auto-20260101T000000Z-0008';
  const workdir = join(resultsRoot, runId, 'coding-agent-workdir');
  mkdirSync(workdir, { recursive: true });
  // A .git file naming a repository outside the run: there is nothing the
  // clone may rewrite, so the pointer would still leave the arm.
  writeFileSync(
    join(workdir, '.git'),
    `gitdir: ${join(root, 'elsewhere', '.git')}\n`,
  );
  writeFileSync(
    join(resultsRoot, runId, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('eta'),
    AGENTS,
  );
  expect(eligible).toHaveLength(1);
  expect(() => cloneWorkspace(eligible[0]!, join(root, 'armT'))).toThrow(
    /points outside the arm/,
  );
});
