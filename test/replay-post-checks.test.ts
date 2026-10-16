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
import { isAbsolute, join } from 'node:path';
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

// A legacy-layout run whose workspace has a linked worktree, an intra-source
// absolute symlink, and an external absolute symlink — the three pointer
// classes the clone must handle. The worktree is either a sibling of the
// workdir, which is what a setup helper makes, or one the agent made inside
// the workdir, which is what a gitignored `.worktrees/` tempts it into.
function recordedWorktreeRun(
  scenario = 'worktree-no-drift-to-main',
  nested = false,
): {
  resultsRoot: string;
  runDir: string;
  worktree: string;
  external: string;
} {
  const resultsRoot = join(root, 'results');
  const runDir = join(
    resultsRoot,
    `${scenario}-claude-auto-20260101T000000Z-aaaa`,
  );
  const wd = join(runDir, 'coding-agent-workdir');
  mkdirSync(wd, { recursive: true });
  git(wd, ['init', '-q', '-b', 'main']);
  git(wd, ['config', 'user.email', 'a@b']);
  git(wd, ['config', 'user.name', 't']);
  writeFileSync(join(wd, 'f.txt'), 'x\n');
  git(wd, ['add', '-A']);
  git(wd, ['commit', '-qm', 'init']);
  const worktree = nested
    ? join(wd, '.worktrees', 'feature')
    : join(runDir, 'coding-agent-workdir-existing-worktree');
  git(wd, ['worktree', 'add', '-q', worktree, '-b', 'feature']);
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
  return { resultsRoot, runDir, worktree, external };
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
  // Both pointer files are reported, and nothing else is.
  expect([...report.gitPointers].sort()).toEqual(
    [
      join(
        dest,
        'coding-agent-workdir',
        '.git',
        'worktrees',
        'coding-agent-workdir-existing-worktree',
        'gitdir',
      ),
      join(dest, 'coding-agent-workdir-existing-worktree', '.git'),
    ].sort(),
  );
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

test('a linked worktree inside the workdir is repaired in the arm, and the source stays byte-identical', () => {
  const { resultsRoot, runDir } = recordedWorktreeRun('worktree-nested', true);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-nested'),
    AGENTS,
  );
  expect(eligible).toHaveLength(1);
  const dest = join(root, 'armN');
  const report = cloneWorkspace(eligible[0]!, dest);
  const admin = join(
    dest,
    'coding-agent-workdir',
    '.git',
    'worktrees',
    'feature',
    'gitdir',
  );
  const dotgit = join(
    dest,
    'coding-agent-workdir',
    '.worktrees',
    'feature',
    '.git',
  );
  expect(
    readFileSync(admin, 'utf8').trim().startsWith(realpathSync(dest)),
  ).toBe(true);
  expect(
    readFileSync(dotgit, 'utf8')
      .trim()
      .replace(/^gitdir: /, '')
      .startsWith(realpathSync(dest)),
  ).toBe(true);
  expect([...report.gitPointers].sort()).toEqual([admin, dotgit].sort());
  expect(hashTree(runDir)).toBe(before);
  expect(
    git(join(dest, 'coding-agent-workdir'), ['worktree', 'list']),
  ).toContain(realpathSync(dest));
});

test('an administrative entry whose worktree the agent deleted outright is dropped from the arm, not failed over', () => {
  const { resultsRoot, runDir, worktree } = recordedWorktreeRun(
    'worktree-stale',
    true,
  );
  // `rm -rf` rather than `git worktree remove`, so the entry outlives it.
  rmSync(worktree, { recursive: true, force: true });
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-stale'),
    AGENTS,
  );
  const dest = join(root, 'armS');
  const report = cloneWorkspace(eligible[0]!, dest);
  expect(
    existsSync(
      join(dest, 'coding-agent-workdir', '.git', 'worktrees', 'feature'),
    ),
  ).toBe(false);
  expect(report.gitPointers).toEqual([]);
  expect(hashTree(runDir)).toBe(before);
});

test('cloneWorkspace refuses an administrative pointer that resolves out of the source, before any git runs', () => {
  const resultsRoot = join(root, 'results7');
  const runDir = join(resultsRoot, 'theta-claude-auto-20260101T000000Z-0009');
  const admin = join(
    runDir,
    'coding-agent-workdir',
    '.git',
    'worktrees',
    'escape',
  );
  mkdirSync(admin, { recursive: true });
  // Under the source by string, beside it once resolved: there is no mapping
  // into the arm for it, and `git worktree repair` must never be pointed at
  // what it names.
  writeFileSync(join(admin, 'gitdir'), `${runDir}/../escaped/.git\n`);
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('theta'),
    AGENTS,
  );
  expect(() => cloneWorkspace(eligible[0]!, join(root, 'armE'))).toThrow(
    /unexpected gitdir pointer/,
  );
  expect(hashTree(runDir)).toBe(before);
});

test('a symlink that climbs out of the source is external, not an intra-source pointer', () => {
  const resultsRoot = join(root, 'results8');
  const runDir = join(resultsRoot, 'iota-claude-auto-20260101T000000Z-0010');
  mkdirSync(join(runDir, 'coding-agent-workdir'), { recursive: true });
  mkdirSync(join(runDir, 'home'), { recursive: true });
  // Spelled under the run, resolves beside it: classification is about where
  // the target lands, so this is an external reference and stays as it is.
  symlinkSync(`${runDir}/../escaped`, join(runDir, 'home', 'climber'));
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('iota'),
    AGENTS,
  );
  const dest = join(root, 'armC');
  const report = cloneWorkspace(eligible[0]!, dest);
  expect(report.externalReferences).toEqual([join(dest, 'home', 'climber')]);
  expect(report.rewrittenSymlinks).toEqual([]);
  expect(readlinkSync(join(dest, 'home', 'climber'))).toBe(
    `${runDir}/../escaped`,
  );
});

test('an absolute target that detours through a sibling run but lands in the source is rewritten', () => {
  const resultsRoot = join(root, 'results9');
  const runDir = join(resultsRoot, 'kappa-claude-auto-20260101T000000Z-0011');
  mkdirSync(join(runDir, 'coding-agent-workdir'), { recursive: true });
  mkdirSync(join(runDir, 'home', 'share'), { recursive: true });
  mkdirSync(join(resultsRoot, 'other'), { recursive: true });
  writeFileSync(join(runDir, 'home', 'share', 'cli'), 'binary\n');
  // `<results>/other/../<run>/home/share/cli` reads as outside the run and
  // resolves inside it.
  // A literal spelling: join() would collapse the `..` away.
  symlinkSync(
    `${resultsRoot}/other/../kappa-claude-auto-20260101T000000Z-0011/home/share/cli`,
    join(runDir, 'home', 'detour'),
  );
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('kappa'),
    AGENTS,
  );
  const dest = join(root, 'armD');
  const report = cloneWorkspace(eligible[0]!, dest);
  expect(report.rewrittenSymlinks).toEqual([join(dest, 'home', 'detour')]);
  expect(readlinkSync(join(dest, 'home', 'detour'))).toBe(
    join(realpathSync(dest), 'home', 'share', 'cli'),
  );
  expect(report.externalReferences).toEqual([]);
});

test('cloneWorkspace refuses an absolute git pointer that climbs out of the arm', () => {
  const resultsRoot = join(root, 'results10');
  const runDir = join(resultsRoot, 'lambda-claude-auto-20260101T000000Z-0012');
  const workdir = join(runDir, 'coding-agent-workdir');
  mkdirSync(workdir, { recursive: true });
  const dest = join(root, 'armP');
  // Textually under the arm, resolves beside it.
  writeFileSync(join(workdir, '.git'), `gitdir: ${dest}/../outside/.git\n`);
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('lambda'),
    AGENTS,
  );
  expect(() => cloneWorkspace(eligible[0]!, dest)).toThrow(
    /points outside the arm/,
  );
  expect(hashTree(runDir)).toBe(before);
});

test('cloneWorkspace refuses a workdir that is a symlink to a repository outside the arm', () => {
  const resultsRoot = join(root, 'results11');
  const runDir = join(resultsRoot, 'mu-claude-auto-20260101T000000Z-0013');
  mkdirSync(runDir, { recursive: true });
  const outside = mkdtempSync(join(tmpdir(), 'outside-repo-'));
  git(outside, ['init', '-q', '-b', 'main']);
  git(outside, ['config', 'user.email', 'a@b']);
  git(outside, ['config', 'user.name', 't']);
  writeFileSync(join(outside, 'f.txt'), 'x\n');
  git(outside, ['add', '-A']);
  git(outside, ['commit', '-qm', 'init']);
  symlinkSync(outside, join(runDir, 'coding-agent-workdir'));
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  const outsideBefore = hashTree(outside);
  const sourceBefore = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('mu'),
    AGENTS,
  );
  expect(eligible).toHaveLength(1);
  expect(() => cloneWorkspace(eligible[0]!, join(root, 'armX'))).toThrow(
    /resolves outside the arm/,
  );
  expect(hashTree(outside)).toBe(outsideBefore);
  expect(hashTree(runDir)).toBe(sourceBefore);
});

test('a worktree recorded with --relative-paths needs no repair and stays self-contained in the arm', () => {
  const resultsRoot = join(root, 'results12');
  const runDir = join(resultsRoot, 'nu-claude-auto-20260101T000000Z-0014');
  const wd = join(runDir, 'coding-agent-workdir');
  mkdirSync(wd, { recursive: true });
  git(wd, ['init', '-q', '-b', 'main']);
  git(wd, ['config', 'user.email', 'a@b']);
  git(wd, ['config', 'user.name', 't']);
  writeFileSync(join(wd, 'f.txt'), 'x\n');
  git(wd, ['add', '-A']);
  git(wd, ['commit', '-qm', 'init']);
  const worktree = join(runDir, 'coding-agent-workdir-existing-worktree');
  git(wd, [
    'worktree',
    'add',
    '-q',
    '--relative-paths',
    worktree,
    '-b',
    'feature',
  ]);
  // The recorded pointers are relative, so they survive the move untouched.
  expect(
    isAbsolute(
      readFileSync(
        join(
          wd,
          '.git',
          'worktrees',
          'coding-agent-workdir-existing-worktree',
          'gitdir',
        ),
        'utf8',
      ).trim(),
    ),
  ).toBe(false);
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('nu'),
    AGENTS,
  );
  const dest = join(root, 'armV');
  const report = cloneWorkspace(eligible[0]!, dest);
  expect(report.gitPointers).toHaveLength(2);
  expect(hashTree(runDir)).toBe(before);
  expect(
    git(join(dest, 'coding-agent-workdir'), ['worktree', 'list']),
  ).toContain(realpathSync(dest));
  expect(
    git(join(dest, 'coding-agent-workdir-existing-worktree'), [
      'rev-parse',
      '--absolute-git-dir',
    ]),
  ).toContain(realpathSync(dest));
});

test('the repair ignores an inherited GIT_DIR: the arm is repaired and the decoy repository is untouched', () => {
  const { resultsRoot, runDir } = recordedWorktreeRun('worktree-decoy', true);
  const decoy = mkdtempSync(join(tmpdir(), 'decoy-repo-'));
  git(decoy, ['init', '-q', '-b', 'main']);
  git(decoy, ['config', 'user.email', 'a@b']);
  git(decoy, ['config', 'user.name', 't']);
  writeFileSync(join(decoy, 'f.txt'), 'x\n');
  git(decoy, ['add', '-A']);
  git(decoy, ['commit', '-qm', 'init']);
  git(decoy, ['worktree', 'add', '-q', join(decoy, 'wt'), '-b', 'feature']);
  const decoyBefore = hashTree(decoy);
  const sourceBefore = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-decoy'),
    AGENTS,
  );
  const dest = join(root, 'armG');
  const savedDir = process.env['GIT_DIR'];
  const savedTree = process.env['GIT_WORK_TREE'];
  process.env['GIT_DIR'] = join(decoy, '.git');
  process.env['GIT_WORK_TREE'] = decoy;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } finally {
    if (savedDir === undefined) delete process.env['GIT_DIR'];
    else process.env['GIT_DIR'] = savedDir;
    if (savedTree === undefined) delete process.env['GIT_WORK_TREE'];
    else process.env['GIT_WORK_TREE'] = savedTree;
  }
  expect(
    readFileSync(
      join(
        dest,
        'coding-agent-workdir',
        '.git',
        'worktrees',
        'feature',
        'gitdir',
      ),
      'utf8',
    )
      .trim()
      .startsWith(realpathSync(dest)),
  ).toBe(true);
  expect(hashTree(decoy)).toBe(decoyBefore);
  expect(hashTree(runDir)).toBe(sourceBefore);
});
