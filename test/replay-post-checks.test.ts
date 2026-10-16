import { afterAll, expect, setDefaultTimeout, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { PointerReport } from '../src/cli/replay-post-checks.ts';
import {
  cloneWorkspace,
  compareArms,
  coverage,
  eligibleRuns,
  expectedPostChecks,
  hashTree,
  INNER_COMMAND_TOOLS,
  replayFixture,
  replayRun,
} from '../src/cli/replay-post-checks.ts';
import type { CheckRecord, FinalVerdict } from '../src/contracts/verdict.ts';

// Every case builds real git repositories and clones whole workspace trees;
// under a full parallel run the slowest cases and the cleanup of `root` have
// been measured past Bun's 5 s default (the hook at 11.9 s on a loaded host).
setDefaultTimeout(60_000);

const root = mkdtempSync(join(tmpdir(), 'replay-'));
afterAll(() => rmSync(root, { recursive: true, force: true }), 60_000);
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

test('cloneWorkspace refuses an administrative entry retained as a symlink out of the arm', () => {
  const { resultsRoot, runDir } = recordedWorktreeRun('worktree-planted');
  const id = 'coding-agent-workdir-existing-worktree';
  const entry = join(runDir, 'coding-agent-workdir', '.git', 'worktrees', id);
  // What an agent could have planted: the administrative entry itself lives
  // outside the run, with a symlink left in its place. Measured on git 2.56,
  // `git worktree repair` then rewrites the external gitdir through the link,
  // and hashTree of the source cannot show it, because the source holds only
  // the link.
  const external = mkdtempSync(join(tmpdir(), 'planted-admin-'));
  cpSync(entry, join(external, id), { recursive: true });
  rmSync(entry, { recursive: true, force: true });
  symlinkSync(join(external, id), entry);
  const externalBefore = hashTree(external);
  const sourceBefore = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-planted'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, join(root, 'armA'));
  } catch (err: unknown) {
    thrown = err;
  }
  // Whatever the clone decided, nothing outside it may have been written.
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(sourceBefore);
  expect(String(thrown)).toMatch(/resolves outside the arm/);
});

test('cloneWorkspace refuses a worktree whose .git file is a symlink out of the arm', () => {
  const { resultsRoot, runDir } = recordedWorktreeRun('worktree-linked-dotgit');
  const dotgit = join(runDir, 'coding-agent-workdir-existing-worktree', '.git');
  // The pointer file itself replaced by a link out of the run. Repair would
  // write the worktree's .git through it; the clone refuses first, at pointer
  // discovery, as it refuses every symlinked `.git` (before that it was
  // refused later, by the repair, as an administrative pointer that no longer
  // resolved inside the source).
  const external = mkdtempSync(join(tmpdir(), 'planted-dotgit-'));
  cpSync(dotgit, join(external, 'pointer'));
  rmSync(dotgit, { force: true });
  symlinkSync(join(external, 'pointer'), dotgit);
  const externalBefore = hashTree(external);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-linked-dotgit'),
    AGENTS,
  );
  expect(() => cloneWorkspace(eligible[0]!, join(root, 'armB'))).toThrow(
    /coding-agent-workdir-existing-worktree\/\.git is a symlink/,
  );
  expect(hashTree(external)).toBe(externalBefore);
});

// A valid administrative entry planted outside the run under a name of the
// agent's choosing: the worktree-side `.git` file is pointed at it. git keys
// its repair on the last component of that backlink, finds no such entry in
// the arm, and — measured on git 2.56 — writes the decoy's gitdir and then, in
// its second pass, the source worktree's `.git` that the arm's entry still
// names. `commondir` is made absolute so the decoy is a repository from where
// it sits, which is what makes git follow it.
function plantDecoyEntry(
  runDir: string,
  worktree: string,
  external: string,
  name: string,
): string {
  const id = 'coding-agent-workdir-existing-worktree';
  const entry = join(runDir, 'coding-agent-workdir', '.git', 'worktrees', id);
  const decoy = join(external, name);
  cpSync(entry, decoy, { recursive: true });
  writeFileSync(
    join(decoy, 'commondir'),
    `${join(runDir, 'coding-agent-workdir', '.git')}\n`,
  );
  writeFileSync(join(decoy, 'gitdir'), `${join(worktree, '.git')}\n`);
  return decoy;
}

test('cloneWorkspace refuses a worktree whose .git backlink names an administrative entry the arm does not have, before any git runs', () => {
  const { resultsRoot, runDir, worktree } = recordedWorktreeRun(
    'worktree-decoy-entry',
  );
  const external = mkdtempSync(join(tmpdir(), 'decoy-entry-'));
  const decoy = plantDecoyEntry(runDir, worktree, external, 'decoyid');
  writeFileSync(join(worktree, '.git'), `gitdir: ${decoy}\n`);
  const externalBefore = hashTree(external);
  const sourceBefore = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-decoy-entry'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, join(root, 'armK'));
  } catch (err: unknown) {
    thrown = err;
  }
  // Whatever the clone decided, nothing outside it may have been written.
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(sourceBefore);
  expect(String(thrown)).toMatch(
    /does not point back at administrative entry coding-agent-workdir-existing-worktree/,
  );
});

test('the backlink is compared as text, the way git reads it: a symlink that resolves to the right entry name is still refused', () => {
  const { resultsRoot, runDir, worktree } = recordedWorktreeRun(
    'worktree-decoy-symlink',
  );
  // The backlink's resolved path ends in the arm's entry id, so a check on the
  // resolved name would pass it; git takes the id from the text, finds no
  // `symdecoy` entry in the arm, and follows the link out.
  const external = mkdtempSync(join(tmpdir(), 'decoy-symlink-'));
  const decoy = plantDecoyEntry(
    runDir,
    worktree,
    external,
    'coding-agent-workdir-existing-worktree',
  );
  symlinkSync(decoy, join(external, 'symdecoy'));
  writeFileSync(
    join(worktree, '.git'),
    `gitdir: ${join(external, 'symdecoy')}\n`,
  );
  const externalBefore = hashTree(external);
  const sourceBefore = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-decoy-symlink'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, join(root, 'armM'));
  } catch (err: unknown) {
    thrown = err;
  }
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(sourceBefore);
  expect(String(thrown)).toMatch(/does not point back at administrative entry/);
});

// A `commondir` planted in the main `.git`: git takes the repository's common
// directory from it, so every administrative lookup — infer_backlink's
// `worktrees/<id>` and the second pass's enumeration — lands in whatever it
// names. Measured on git 2.56 with the clone's former `git worktree repair`
// spawn: an external copy of the repository as the common directory, holding
// an entry for the arm's worktree id and a second entry naming the source
// worktree, had that entry's gitdir rewritten, and the SOURCE worktree's
// `.git` was rewritten after it.
test('cloneWorkspace refuses a main .git whose commondir names a repository outside the arm, before any pointer is written', () => {
  const { resultsRoot, runDir, worktree } =
    recordedWorktreeRun('worktree-commondir');
  const id = 'coding-agent-workdir-existing-worktree';
  const mainGit = join(runDir, 'coding-agent-workdir', '.git');
  const external = mkdtempSync(join(tmpdir(), 'commondir-'));
  const evil = join(external, 'evil.git');
  cpSync(mainGit, evil, { recursive: true });
  cpSync(join(evil, 'worktrees', id), join(evil, 'worktrees', 'other'), {
    recursive: true,
  });
  writeFileSync(
    join(evil, 'worktrees', 'other', 'gitdir'),
    `${join(worktree, '.git')}\n`,
  );
  writeFileSync(join(mainGit, 'commondir'), `${evil}\n`);
  const externalBefore = hashTree(external);
  const sourceBefore = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-commondir'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, join(root, 'armO'));
  } catch (err: unknown) {
    thrown = err;
  }
  // Whatever the clone decided, nothing outside it may have been written.
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(sourceBefore);
  expect(String(thrown)).toMatch(
    /commondir names a common directory that is not the arm's/,
  );
});

test('cloneWorkspace refuses an administrative entry whose commondir is absolute into the source', () => {
  const { resultsRoot, runDir } = recordedWorktreeRun(
    'worktree-entry-commondir',
  );
  const id = 'coding-agent-workdir-existing-worktree';
  const entry = join(runDir, 'coding-agent-workdir', '.git', 'worktrees', id);
  // `git worktree add` writes `../..` here. Made absolute, the copied entry
  // keeps naming the source's refs and objects, and git run later inside the
  // arm's worktree would read and write them.
  writeFileSync(
    join(entry, 'commondir'),
    `${join(runDir, 'coding-agent-workdir', '.git')}\n`,
  );
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('worktree-entry-commondir'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, join(root, 'armQ'));
  } catch (err: unknown) {
    thrown = err;
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(
    /commondir names a common directory that is not the arm's/,
  );
});

// A legacy-layout run whose workspace is one repository with one commit and
// no linked worktree: the fixture for the configuration the arm carries into
// a replay's git.
function recordedRepoRun(scenario: string): {
  resultsRoot: string;
  runDir: string;
  wd: string;
} {
  const resultsRoot = join(root, 'results-config');
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
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({ checks: [record('git-repo', true, 'post')] }),
    ),
  );
  return { resultsRoot, runDir, wd };
}

// Every file the clone reports as rewritten is named relative to the arm and
// lies under it.
function expectArmRelative(report: PointerReport): void {
  for (const entry of report.rewrittenConfig ?? []) {
    expect(isAbsolute(entry)).toBe(false);
    expect(entry === '..' || entry.startsWith('../')).toBe(false);
  }
}

// Measured on git 2.56 with the clone before this check: `git checkout -- .`
// run inside the arm recreated the file in the SOURCE working tree, because
// `core.worktree` still named it.
test('a core.worktree naming the source working tree is re-aimed at the arm, and git run inside the arm writes only the arm', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun('config-core-worktree');
  git(wd, ['config', 'core.worktree', wd]);
  // The agent left a tracked file deleted and the record keeps that state;
  // `checkout -- .` recreates it wherever git takes the working tree to be.
  rmSync(join(wd, 'f.txt'));
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-core-worktree'),
    AGENTS,
  );
  const dest = join(root, 'armW');
  const report = cloneWorkspace(eligible[0]!, dest);
  const arm = join(dest, 'coding-agent-workdir');
  git(arm, ['checkout', '--', '.']);
  expect(hashTree(runDir)).toBe(before);
  expect(existsSync(join(wd, 'f.txt'))).toBe(false);
  expect(existsSync(join(arm, 'f.txt'))).toBe(true);
  expect(report.rewrittenConfig).toEqual(['coding-agent-workdir/.git/config']);
  expectArmRelative(report);
  const config = readFileSync(join(arm, '.git', 'config'), 'utf8');
  expect(config).not.toContain(runDir);
  expect(config).toContain(
    `worktree = ${join(realpathSync(dest), 'coding-agent-workdir')}`,
  );
});

// A gitdir the agent made inside the workdir, with a `commondir` naming the
// run's main `.git`: git takes refs and objects from there. Measured on git
// 2.56 with the clone before this check: `update-ref` run in the arm's copy
// created the ref in the SOURCE `.git`.
test('cloneWorkspace refuses a nested repository whose commondir names the source .git, before any pointer is written', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-nested-commondir',
  );
  const sub = join(wd, 'sub', '.git');
  mkdirSync(sub, { recursive: true });
  writeFileSync(join(sub, 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(join(sub, 'config'), '[core]\n\trepositoryformatversion = 0\n');
  writeFileSync(join(sub, 'commondir'), `${join(wd, '.git')}\n`);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-nested-commondir'),
    AGENTS,
  );
  const dest = join(root, 'armY');
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  if (thrown === undefined) {
    // What a replay's git does with an arm the clone accepted.
    git(join(dest, 'coding-agent-workdir', 'sub'), [
      'update-ref',
      'refs/heads/planted',
      'HEAD',
    ]);
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(
    /commondir names a common directory outside the arm/,
  );
});

test('cloneWorkspace refuses a .git/modules entry whose commondir names the source .git', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-module-commondir',
  );
  const mod = join(wd, '.git', 'modules', 'dep');
  mkdirSync(mod, { recursive: true });
  writeFileSync(join(mod, 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(join(mod, 'config'), '[core]\n\trepositoryformatversion = 0\n');
  writeFileSync(join(mod, 'commondir'), `${join(wd, '.git')}\n`);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-module-commondir'),
    AGENTS,
  );
  const dest = join(root, 'armU');
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  if (thrown === undefined) {
    git(join(dest, 'coding-agent-workdir'), [
      '--git-dir',
      join(dest, 'coding-agent-workdir', '.git', 'modules', 'dep'),
      'update-ref',
      'refs/heads/planted',
      'HEAD',
    ]);
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(
    /commondir names a common directory outside the arm/,
  );
});

test('cloneWorkspace refuses an include.path that leaves the run', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-include-external',
  );
  const external = mkdtempSync(join(tmpdir(), 'include-'));
  const included = join(external, 'extra.gitconfig');
  writeFileSync(included, `[core]\n\tworktree = ${wd}\n`);
  git(wd, ['config', 'include.path', included]);
  const externalBefore = hashTree(external);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-include-external'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, join(root, 'armZ'));
  } catch (err: unknown) {
    thrown = err;
  }
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(/include path resolves outside the arm/);
});

test('an include.path into the source is re-aimed at the arm copy, and the copy is sanitized too', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun('config-include-source');
  mkdirSync(join(runDir, 'home'), { recursive: true });
  const included = join(runDir, 'home', 'extra.gitconfig');
  writeFileSync(included, `[core]\n\tworktree = ${wd}\n`);
  git(wd, ['config', 'include.path', included]);
  // `~/` is git's spelling of HOME, which for the agent was the run's home.
  writeFileSync(
    join(runDir, 'home', 'tilde.gitconfig'),
    '[user]\n\tname = t\n',
  );
  git(wd, ['config', '--add', 'include.path', '~/tilde.gitconfig']);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-include-source'),
    AGENTS,
  );
  const dest = join(root, 'armI');
  const report = cloneWorkspace(eligible[0]!, dest);
  const armReal = realpathSync(dest);
  expect(hashTree(runDir)).toBe(before);
  expect(report.rewrittenConfig).toEqual([
    'coding-agent-workdir/.git/config',
    'home/extra.gitconfig',
  ]);
  expectArmRelative(report);
  const config = readFileSync(
    join(dest, 'coding-agent-workdir', '.git', 'config'),
    'utf8',
  );
  expect(config).not.toContain(runDir);
  expect(config).toContain(
    `path = ${join(armReal, 'home', 'extra.gitconfig')}`,
  );
  expect(config).toContain(
    `path = ${join(armReal, 'home', 'tilde.gitconfig')}`,
  );
  const copy = readFileSync(join(dest, 'home', 'extra.gitconfig'), 'utf8');
  expect(copy).not.toContain(runDir);
  expect(copy).toContain(`worktree = ${join(armReal, 'coding-agent-workdir')}`);
  // git reads the re-aimed include, and through it the arm's working tree.
  expect(
    git(join(dest, 'coding-agent-workdir'), ['config', 'core.worktree']).trim(),
  ).toBe(join(armReal, 'coding-agent-workdir'));
});

test('an alternates entry naming the source object store is re-aimed at the arm', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-alternates-source',
  );
  mkdirSync(join(wd, '.git', 'objects', 'info'), { recursive: true });
  writeFileSync(
    join(wd, '.git', 'objects', 'info', 'alternates'),
    `${join(wd, '.git', 'objects')}\n`,
  );
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-alternates-source'),
    AGENTS,
  );
  const dest = join(root, 'armJ');
  const report = cloneWorkspace(eligible[0]!, dest);
  const arm = join(dest, 'coding-agent-workdir');
  expect(hashTree(runDir)).toBe(before);
  expect(report.rewrittenConfig).toEqual([
    'coding-agent-workdir/.git/objects/info/alternates',
  ]);
  expectArmRelative(report);
  expect(report.externalReferences).toEqual([]);
  expect(
    readFileSync(join(arm, '.git', 'objects', 'info', 'alternates'), 'utf8'),
  ).toBe(
    `${join(realpathSync(dest), 'coding-agent-workdir', '.git', 'objects')}\n`,
  );
  expect(git(arm, ['cat-file', '-p', 'HEAD:f.txt'])).toBe('x\n');
});

test('an alternates entry outside the run is kept and reported as an external reference', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-alternates-external',
  );
  const external = mkdtempSync(join(tmpdir(), 'alternates-'));
  mkdirSync(join(external, 'objects'));
  mkdirSync(join(wd, '.git', 'objects', 'info'), { recursive: true });
  writeFileSync(
    join(wd, '.git', 'objects', 'info', 'alternates'),
    `${join(external, 'objects')}\n`,
  );
  const externalBefore = hashTree(external);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-alternates-external'),
    AGENTS,
  );
  const dest = join(root, 'armH');
  const report = cloneWorkspace(eligible[0]!, dest);
  const alternates = join(
    dest,
    'coding-agent-workdir',
    '.git',
    'objects',
    'info',
    'alternates',
  );
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(before);
  expect(report.externalReferences).toEqual([alternates]);
  expect(report.rewrittenConfig).toBeUndefined();
  expectArmRelative(report);
  expect(readFileSync(alternates, 'utf8')).toBe(
    `${join(external, 'objects')}\n`,
  );
});

test('cloneWorkspace refuses a git config it cannot read in full: a line continuation, a quoted value', () => {
  const plants: [string, string][] = [
    // A trailing backslash folds the next line into this value, so a reader
    // that took the lines one at a time would misread both.
    ['config-continuation', '[core]\n\tworktree = /some/\\\n\twhere\n'],
    // A quoted value with an escape, as git writes one for a value holding `"`.
    ['config-quoted', '[user]\n\tname = "a \\" b"\n'],
  ];
  for (const [scenario, text] of plants) {
    const { resultsRoot, runDir, wd } = recordedRepoRun(scenario);
    appendFileSync(join(wd, '.git', 'config'), text);
    const before = hashTree(runDir);
    const { eligible } = eligibleRuns(
      resultsRoot,
      scenariosRootWith(scenario),
      AGENTS,
    );
    let thrown: unknown;
    try {
      cloneWorkspace(eligible[0]!, join(root, `arm-${scenario}`));
    } catch (err: unknown) {
      thrown = err;
    }
    expect(hashTree(runDir)).toBe(before);
    expect(String(thrown)).toMatch(/a git config line the clone cannot read/);
  }
});

// The re-review's probes at the round-6 head. A component on the way to an
// alternates file — `objects`, or `objects/info` — which the gitdir walk never
// vetted, was a symlink out of the arm, and the pass read and rewrote the file
// it led to before any check saw the link: the SOURCE's alternates for (a),
// an external directory's for (b), and the clone returned success for (b).
test('cloneWorkspace refuses a .git/objects that is a relative link climbing out of the arm into the source, before reading through it', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-objects-into-source',
  );
  const dest = join(root, 'armAa');
  const objectsReal = join(runDir, 'objects-real');
  renameSync(join(wd, '.git', 'objects'), objectsReal);
  mkdirSync(join(objectsReal, 'info'), { recursive: true });
  // The line names a source path whose arm mapping does not pass through the
  // planted link, so the pass places it as 'source' and rewrites it.
  writeFileSync(join(objectsReal, 'info', 'alternates'), `${objectsReal}\n`);
  // Relative to the ARM's `.git` the link lands in the source. The copy keeps
  // it verbatim and the symlink rewrite leaves relative links alone.
  symlinkSync(
    relative(join(dest, 'coding-agent-workdir', '.git'), objectsReal),
    join(wd, '.git', 'objects'),
  );
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-objects-into-source'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(/still points into the source/);
});

test('cloneWorkspace refuses a .git/objects/info that is an absolute link to a directory outside the run, before reading through it', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun('config-info-external');
  const external = mkdtempSync(join(tmpdir(), 'info-'));
  writeFileSync(
    join(external, 'alternates'),
    `${join(wd, '.git', 'objects')}\n`,
  );
  rmSync(join(wd, '.git', 'objects', 'info'), { recursive: true, force: true });
  symlinkSync(external, join(wd, '.git', 'objects', 'info'));
  const externalBefore = hashTree(external);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-info-external'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, join(root, 'armAb'));
  } catch (err: unknown) {
    thrown = err;
  }
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(/resolves outside the arm/);
});

test('cloneWorkspace refuses a .git/objects that is a relative link to a directory outside the run', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-objects-external',
  );
  const dest = join(root, 'armAc');
  const external = mkdtempSync(join(tmpdir(), 'objects-'));
  mkdirSync(join(external, 'objects', 'info'), { recursive: true });
  mkdirSync(join(runDir, 'objects-real'));
  writeFileSync(
    join(external, 'objects', 'info', 'alternates'),
    `${join(runDir, 'objects-real')}\n`,
  );
  rmSync(join(wd, '.git', 'objects'), { recursive: true, force: true });
  symlinkSync(
    relative(
      join(dest, 'coding-agent-workdir', '.git'),
      join(external, 'objects'),
    ),
    join(wd, '.git', 'objects'),
  );
  const externalBefore = hashTree(external);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-objects-external'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(/resolves outside the arm/);
});

// A gitdir git accepts without a `config`: HEAD in the gitdir, objects and
// refs through `commondir` — the shape of a linked worktree's administrative
// entry, which git uses wherever a `.git` file points. Planted at
// <wd>/.gitadmin/wt and pointed to by <wd>/wt/.git, with the backlink
// relative so that the pointer sweep passes both files. `head` is the HEAD's
// content: a symbolic ref unless a test wants a detached id or junk there.
function plantAdminGitDir(
  wd: string,
  commondir: string,
  head = 'ref: refs/heads/main\n',
): void {
  const admin = join(wd, '.gitadmin', 'wt');
  mkdirSync(admin, { recursive: true });
  mkdirSync(join(wd, 'wt'));
  writeFileSync(join(admin, 'HEAD'), head);
  writeFileSync(join(admin, 'commondir'), `${commondir}\n`);
  writeFileSync(join(admin, 'gitdir'), '../../wt/.git\n');
  writeFileSync(join(wd, 'wt', '.git'), 'gitdir: ../.gitadmin/wt\n');
}

// Measured on git 2.56 at the round-6 head: the clone accepted the arm — the
// gitdir has no `config`, so the walk did not take it for one, and the
// pointer resolves inside the arm — and `update-ref` run in <arm>/wd/wt
// created the ref in the SOURCE `.git`.
test('cloneWorkspace refuses a config-less gitdir, reached through an in-arm .git file, whose commondir names the source .git', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-less-gitdir-source',
  );
  plantAdminGitDir(wd, join(wd, '.git'));
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-less-gitdir-source'),
    AGENTS,
  );
  const dest = join(root, 'armAd');
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  if (thrown === undefined) {
    // What a replay's git does with an arm the clone accepted.
    git(join(dest, 'coding-agent-workdir', 'wt'), [
      'update-ref',
      'refs/heads/planted',
      'HEAD',
    ]);
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(
    /commondir names a common directory outside the arm/,
  );
});

test('the same gitdir with its commondir inside the arm clones, and update-ref run in its worktree writes the arm alone', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun('config-less-gitdir-arm');
  plantAdminGitDir(wd, '../../.git');
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-less-gitdir-arm'),
    AGENTS,
  );
  const dest = join(root, 'armAe');
  const report = cloneWorkspace(eligible[0]!, dest);
  const arm = join(dest, 'coding-agent-workdir');
  git(join(arm, 'wt'), ['update-ref', 'refs/heads/planted', 'HEAD']);
  expect(hashTree(runDir)).toBe(before);
  expect(existsSync(join(arm, '.git', 'refs', 'heads', 'planted'))).toBe(true);
  expect(existsSync(join(wd, '.git', 'refs', 'heads', 'planted'))).toBe(false);
  expect(report.gitPointers).toContain(join(arm, 'wt', '.git'));
});

// Measured on git 2.56 at the round-7 head: validate_headref() takes a
// detached id in either case (get_oid_hex_any() maps both through
// hexval_table), but the clone's predicate took lowercase digits only, and
// both routes to a gitdir ran through it. The previous fixture with its HEAD
// an uppercase id was therefore sanitized by neither route: the clone
// accepted the arm, and `update-ref` run in <arm>/wd/wt created the ref in
// the SOURCE `.git` through the unchecked commondir.
test('cloneWorkspace refuses a pointer target whose detached HEAD is an uppercase id and whose commondir names the source .git', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-less-gitdir-upper-source',
  );
  const oid = git(wd, ['rev-parse', 'HEAD']).trim();
  plantAdminGitDir(wd, join(wd, '.git'), `${oid.toUpperCase()}\n`);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-less-gitdir-upper-source'),
    AGENTS,
  );
  const dest = join(root, 'armAj');
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  if (thrown === undefined) {
    // What a replay's git does with an arm the clone accepted.
    git(join(dest, 'coding-agent-workdir', 'wt'), [
      'update-ref',
      'refs/heads/planted',
      'HEAD',
    ]);
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(
    /commondir names a common directory outside the arm/,
  );
});

test('the same gitdir with an uppercase detached HEAD and its commondir inside the arm clones, and git run in its worktree reads and writes the arm alone', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-less-gitdir-upper-arm',
  );
  const oid = git(wd, ['rev-parse', 'HEAD']).trim();
  plantAdminGitDir(wd, '../../.git', `${oid.toUpperCase()}\n`);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-less-gitdir-upper-arm'),
    AGENTS,
  );
  const dest = join(root, 'armAk');
  const report = cloneWorkspace(eligible[0]!, dest);
  const arm = join(dest, 'coding-agent-workdir');
  expect(git(join(arm, 'wt'), ['rev-parse', 'HEAD']).trim()).toBe(oid);
  git(join(arm, 'wt'), ['update-ref', 'refs/heads/planted', 'HEAD']);
  expect(hashTree(runDir)).toBe(before);
  expect(existsSync(join(arm, '.git', 'refs', 'heads', 'planted'))).toBe(true);
  expect(existsSync(join(wd, '.git', 'refs', 'heads', 'planted'))).toBe(false);
  expect(report.gitPointers).toContain(join(arm, 'wt', '.git'));
});

// A pointer target is a gitdir on the pointer's word, whatever its HEAD
// holds. git 2.56 refuses this one itself — `gitfile does not point to a
// valid repository`, the HEAD failing validate_headref() — so no git writes
// through it today; the clone refuses it all the same, because the pointer
// route no longer asks the HEAD, and a HEAD shape the predicate misjudges is
// exactly what it would have asked about.
test('a pointer target whose HEAD git would reject is sanitized all the same: its commondir naming the source .git is refused', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'config-less-gitdir-junk-head',
  );
  plantAdminGitDir(wd, join(wd, '.git'), 'garbage\n');
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-less-gitdir-junk-head'),
    AGENTS,
  );
  const dest = join(root, 'armAl');
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  if (thrown === undefined) {
    // What a replay's git does with an arm the clone accepted; its status is
    // not checked, because git refuses the gitfile and that is not the point.
    spawnSync('git', ['update-ref', 'refs/heads/planted', 'HEAD'], {
      cwd: join(dest, 'coding-agent-workdir', 'wt'),
    });
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(
    /commondir names a common directory outside the arm/,
  );
});

// The walk has only the HEAD to go on, so it has to accept every detached
// HEAD git does. Each shape here is one git 2.56 took for a repository
// (GIT_DIR naming a directory with the HEAD, `objects` and `refs`), planted
// where only the walk can find it, with a commondir naming the source
// `.git`; git run in the arm's copy takes it for a bare repository and
// reaches refs and objects through that commondir. At the round-7 head
// `update-ref` there wrote the SOURCE `.git` for every shape but the
// lowercase 64-digit id, which the 40-digit prefix already covered: a
// 64-digit id in uppercase; a 41st digit after a 40-digit id, which
// get_oid_hex_any() ignores; a 40-digit id with no newline; a HEAD past 256
// bytes, of which git reads the first 255.
test('the walk recognizes every detached HEAD git does: a 64-digit id in either case, an id with trailing digits or no newline, an oversized HEAD, each with a commondir naming the source .git, is refused', () => {
  const shapes: [string, (oid: string) => string][] = [
    [
      'head-sha256-upper',
      (oid) => `${(oid + oid.slice(0, 24)).toUpperCase()}\n`,
    ],
    ['head-sha256-lower', (oid) => `${oid + oid.slice(0, 24)}\n`],
    ['head-41-digits', (oid) => `${oid.toUpperCase()}a\n`],
    ['head-no-newline', (oid) => oid.toUpperCase()],
    ['head-oversized', () => `ref: refs/heads/main\n${'0'.repeat(300)}`],
  ];
  for (const [scenario, head] of shapes) {
    const { resultsRoot, runDir, wd } = recordedRepoRun(scenario);
    const oid = git(wd, ['rev-parse', 'HEAD']).trim();
    const sub = join(wd, 'sub');
    mkdirSync(sub);
    writeFileSync(join(sub, 'HEAD'), head(oid));
    writeFileSync(join(sub, 'commondir'), `${join(wd, '.git')}\n`);
    const before = hashTree(runDir);
    const { eligible } = eligibleRuns(
      resultsRoot,
      scenariosRootWith(scenario),
      AGENTS,
    );
    const dest = join(root, `arm-${scenario}`);
    let thrown: unknown;
    try {
      cloneWorkspace(eligible[0]!, dest);
    } catch (err: unknown) {
      thrown = err;
    }
    if (thrown === undefined) {
      git(join(dest, 'coding-agent-workdir', 'sub'), [
        'update-ref',
        'refs/heads/planted',
        oid,
      ]);
    }
    expect(hashTree(runDir)).toBe(before);
    expect(String(thrown)).toMatch(
      /sub\/commondir names a common directory outside the arm/,
    );
  }
});

// Administrative entries of repositories other than the main one: a
// repository nested in the workdir has its own `.git/worktrees/<id>`, and so
// can a submodule's `.git/modules/<name>`. Both are recognized by the same
// rule and held inside the arm.
test('cloneWorkspace refuses a worktree entry of a nested repository, or of a .git/modules entry, whose commondir names the source .git', () => {
  const plants: [string, (wd: string) => string][] = [
    [
      'config-nested-entry',
      (wd) => {
        const sub = join(wd, 'sub');
        mkdirSync(sub);
        git(sub, ['init', '-q', '-b', 'main']);
        git(sub, ['config', 'user.email', 'a@b']);
        git(sub, ['config', 'user.name', 't']);
        writeFileSync(join(sub, 'g.txt'), 'y\n');
        git(sub, ['add', '-A']);
        git(sub, ['commit', '-qm', 'init']);
        git(sub, [
          'worktree',
          'add',
          '-q',
          '--relative-paths',
          join(sub, 'swt'),
          '-b',
          'feature',
        ]);
        writeFileSync(
          join(sub, '.git', 'worktrees', 'swt', 'commondir'),
          `${join(wd, '.git')}\n`,
        );
        return join('sub', 'swt');
      },
    ],
    [
      'config-module-entry',
      (wd) => {
        const mod = join(wd, '.git', 'modules', 'dep');
        mkdirSync(join(mod, 'worktrees', 'x'), { recursive: true });
        mkdirSync(join(mod, 'objects'));
        mkdirSync(join(mod, 'refs'));
        writeFileSync(join(mod, 'HEAD'), 'ref: refs/heads/main\n');
        writeFileSync(
          join(mod, 'config'),
          '[core]\n\trepositoryformatversion = 0\n',
        );
        writeFileSync(
          join(mod, 'worktrees', 'x', 'HEAD'),
          'ref: refs/heads/main\n',
        );
        writeFileSync(
          join(mod, 'worktrees', 'x', 'commondir'),
          `${join(wd, '.git')}\n`,
        );
        mkdirSync(join(wd, 'depwt'));
        writeFileSync(
          join(wd, 'depwt', '.git'),
          'gitdir: ../.git/modules/dep/worktrees/x\n',
        );
        return 'depwt';
      },
    ],
  ];
  for (const [scenario, plant] of plants) {
    const { resultsRoot, runDir, wd } = recordedRepoRun(scenario);
    const worktree = plant(wd);
    const before = hashTree(runDir);
    const { eligible } = eligibleRuns(
      resultsRoot,
      scenariosRootWith(scenario),
      AGENTS,
    );
    const dest = join(root, `arm-${scenario}`);
    let thrown: unknown;
    try {
      cloneWorkspace(eligible[0]!, dest);
    } catch (err: unknown) {
      thrown = err;
    }
    if (thrown === undefined) {
      git(join(dest, 'coding-agent-workdir', worktree), [
        'update-ref',
        'refs/heads/planted',
        'HEAD',
      ]);
    }
    expect(hashTree(runDir)).toBe(before);
    expect(String(thrown)).toMatch(
      /commondir names a common directory outside the arm/,
    );
  }
});

// A repository needs no `config` and no `commondir` to be one to git: HEAD,
// `objects` and `refs` suffice, and a `.git` file can point at it under any
// name. Its alternates is the one thing such a gitdir can aim at the source.
test('a pointer target with HEAD, objects and refs but neither config nor commondir is a gitdir too, and its alternates is re-aimed', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun('config-pointer-target');
  const real = join(wd, '.gitreal');
  mkdirSync(join(real, 'objects', 'info'), { recursive: true });
  mkdirSync(join(real, 'refs'));
  writeFileSync(join(real, 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(
    join(real, 'objects', 'info', 'alternates'),
    `${join(wd, '.git', 'objects')}\n`,
  );
  mkdirSync(join(wd, 'other'));
  writeFileSync(join(wd, 'other', '.git'), 'gitdir: ../.gitreal\n');
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('config-pointer-target'),
    AGENTS,
  );
  const dest = join(root, 'armAf');
  const report = cloneWorkspace(eligible[0]!, dest);
  const arm = join(dest, 'coding-agent-workdir');
  expect(hashTree(runDir)).toBe(before);
  expect(report.rewrittenConfig).toEqual([
    'coding-agent-workdir/.gitreal/objects/info/alternates',
  ]);
  expectArmRelative(report);
  expect(
    readFileSync(
      join(arm, '.gitreal', 'objects', 'info', 'alternates'),
      'utf8',
    ),
  ).toBe(
    `${join(realpathSync(dest), 'coding-agent-workdir', '.git', 'objects')}\n`,
  );
  // git takes it as the repository of <arm>/wd/other.
  expect(
    git(join(arm, 'other'), ['rev-parse', '--absolute-git-dir']),
  ).toContain(join(realpathSync(dest), 'coding-agent-workdir', '.gitreal'));
});

// A `.git` entry that is a symlink. No git command writes one — `git init`,
// `clone`, `worktree add` and `submodule add` create a regular file or a
// directory — but git follows one, so the link chooses the repository every
// later in-arm git command uses, and no pointer check read it: the pointer
// sweeps took regular files, and the symlink pass judged only where the link
// itself landed. Measured on git 2.56 at the round-6 head with this fixture:
// the clone reported nothing, `rev-parse --absolute-git-dir` run in
// <arm>/wd/wt named the SOURCE `.git`, and `update-ref` there wrote it.
test('cloneWorkspace refuses a .git that is a symlink to an in-arm file naming the source .git, before any pointer is written', () => {
  const { resultsRoot, runDir } = recordedWorktreeRun('dotgit-symlink-file');
  const wd = join(runDir, 'coding-agent-workdir');
  mkdirSync(join(wd, 'wt'));
  writeFileSync(join(wd, 'ptr.txt'), `gitdir: ${join(wd, '.git')}\n`);
  symlinkSync('../ptr.txt', join(wd, 'wt', '.git'));
  const adminPointer = join(
    'coding-agent-workdir',
    '.git',
    'worktrees',
    'coding-agent-workdir-existing-worktree',
    'gitdir',
  );
  const recorded = readFileSync(join(runDir, adminPointer), 'utf8');
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('dotgit-symlink-file'),
    AGENTS,
  );
  const dest = join(root, 'armAg');
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  if (thrown === undefined) {
    // What a replay's git does with an arm the clone accepted.
    git(join(dest, 'coding-agent-workdir', 'wt'), [
      'update-ref',
      'refs/heads/planted',
      'HEAD',
    ]);
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(/wt\/\.git is a symlink/);
  // The refusal preceded the repair: the arm's copy of the real worktree's
  // administrative pointer still reads as the copy left it, naming the source.
  expect(readFileSync(join(dest, adminPointer), 'utf8')).toBe(recorded);
});

test('cloneWorkspace refuses a .git that is a symlink to a .git directory inside the arm', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun('dotgit-symlink-armdir');
  mkdirSync(join(wd, 'wt'));
  // Relative, so the link lands in the arm's own `.git`: git run in the arm
  // would write the arm, but the shape is one git never makes, and nothing
  // vets what the link selects.
  symlinkSync('../.git', join(wd, 'wt', '.git'));
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('dotgit-symlink-armdir'),
    AGENTS,
  );
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, join(root, 'armAh'));
  } catch (err: unknown) {
    thrown = err;
  }
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(
    /wt\/\.git is a symlink; git never writes one under that name/,
  );
});

// Before this round a `.git` symlink to a directory outside the run was kept
// and reported as an external reference, like any other such link; git run
// in the arm then used that repository. Measured on git 2.56 at the round-6
// head: `update-ref` run in <arm>/wd/wt created the ref in the EXTERNAL
// repository.
test('cloneWorkspace refuses a .git that is a symlink to a repository outside the run, where it used to report it', () => {
  const { resultsRoot, runDir, wd } = recordedRepoRun(
    'dotgit-symlink-external',
  );
  const external = mkdtempSync(join(tmpdir(), 'dotgit-external-'));
  git(external, ['init', '-q', '-b', 'main']);
  git(external, ['config', 'user.email', 'a@b']);
  git(external, ['config', 'user.name', 't']);
  writeFileSync(join(external, 'f.txt'), 'x\n');
  git(external, ['add', '-A']);
  git(external, ['commit', '-qm', 'init']);
  mkdirSync(join(wd, 'wt'));
  symlinkSync(join(external, '.git'), join(wd, 'wt', '.git'));
  const externalBefore = hashTree(external);
  const before = hashTree(runDir);
  const { eligible } = eligibleRuns(
    resultsRoot,
    scenariosRootWith('dotgit-symlink-external'),
    AGENTS,
  );
  const dest = join(root, 'armAi');
  let thrown: unknown;
  try {
    cloneWorkspace(eligible[0]!, dest);
  } catch (err: unknown) {
    thrown = err;
  }
  if (thrown === undefined) {
    git(join(dest, 'coding-agent-workdir', 'wt'), [
      'update-ref',
      'refs/heads/planted',
      'HEAD',
    ]);
  }
  expect(hashTree(external)).toBe(externalBefore);
  expect(hashTree(runDir)).toBe(before);
  expect(String(thrown)).toMatch(/wt\/\.git is a symlink/);
});

// The same filter hid a `gitdir` pointer file that is a symlink. The main
// repository's entries are read through requireStructureInsideArm and
// repaired through the link, but a nested repository's entries are reached
// only by the pointer sweep, which took regular files. Measured on git 2.56
// at the round-6 head: the clone listed `sub/swt/.git` as its one pointer,
// and `git worktree repair` run in <arm>/wd/sub rewrote the SOURCE's
// `sub/swt/.git`.
test('cloneWorkspace refuses a gitdir pointer file that is a symlink, in a nested repository and in the main repository alike', () => {
  const plants: [
    string,
    (wd: string, worktree: string) => { pointer: string; repairIn: string },
  ][] = [
    [
      'gitdir-symlink-nested',
      (wd) => {
        const sub = join(wd, 'sub');
        mkdirSync(sub);
        git(sub, ['init', '-q', '-b', 'main']);
        git(sub, ['config', 'user.email', 'a@b']);
        git(sub, ['config', 'user.name', 't']);
        writeFileSync(join(sub, 'g.txt'), 'y\n');
        git(sub, ['add', '-A']);
        git(sub, ['commit', '-qm', 'init']);
        git(sub, [
          'worktree',
          'add',
          '-q',
          '--relative-paths',
          join(sub, 'swt'),
          '-b',
          'feature',
        ]);
        const pointer = join(sub, '.git', 'worktrees', 'swt', 'gitdir');
        rmSync(pointer);
        writeFileSync(join(sub, 'ptr.txt'), `${join(sub, 'swt', '.git')}\n`);
        symlinkSync('../../../ptr.txt', pointer);
        return { pointer, repairIn: 'sub' };
      },
    ],
    [
      'gitdir-symlink-main',
      (wd, worktree) => {
        const pointer = join(
          wd,
          '.git',
          'worktrees',
          'coding-agent-workdir-existing-worktree',
          'gitdir',
        );
        rmSync(pointer);
        writeFileSync(join(wd, 'ptr.txt'), `${join(worktree, '.git')}\n`);
        symlinkSync('../../../ptr.txt', pointer);
        return { pointer, repairIn: '.' };
      },
    ],
  ];
  for (const [scenario, plant] of plants) {
    const { resultsRoot, runDir, worktree } = recordedWorktreeRun(scenario);
    const wd = join(runDir, 'coding-agent-workdir');
    const { pointer, repairIn } = plant(wd, worktree);
    const before = hashTree(runDir);
    const { eligible } = eligibleRuns(
      resultsRoot,
      scenariosRootWith(scenario),
      AGENTS,
    );
    const dest = join(root, `arm-${scenario}`);
    let thrown: unknown;
    try {
      cloneWorkspace(eligible[0]!, dest);
    } catch (err: unknown) {
      thrown = err;
    }
    if (thrown === undefined) {
      git(join(dest, 'coding-agent-workdir', repairIn), ['worktree', 'repair']);
    }
    expect(hashTree(runDir)).toBe(before);
    expect(String(thrown)).toContain(
      `${relative(runDir, pointer)} is a symlink`,
    );
    // The refusal preceded every write: read through the arm's link, the
    // file it leads to still names the source worktree, as the copy left it.
    expect(readFileSync(join(dest, relative(runDir, pointer)), 'utf8')).toBe(
      readFileSync(pointer, 'utf8'),
    );
  }
});

const REPO = resolve(import.meta.dir, '..');
const FIX = join(REPO, 'test', 'fixtures', 'replay-synthetic');
const armRoots: string[] = [];
const OPTS = {
  repoRoot: REPO,
  codingAgent: 'claude-auto',
  scratch: () => {
    const dir = mkdtempSync(join(tmpdir(), 'arms-'));
    armRoots.push(dir);
    return dir;
  },
};
// The seam-dumper case reads an arm's home after the replay returns, so the
// arms are swept once at the end rather than released per call.
afterAll(() => {
  for (const dir of armRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
}, 60_000);

// results/ is gitignored (evals/.gitignore:1), so a feature worktree has no corpus of its
// own: the retained corpus is the primary checkout's results/, found through the common git
// dir (<primary>/.git for a linked worktree), unless QUORUM_CORPUS_ROOT names another.
function primaryCheckout(repo: string): string {
  const r = spawnSync('git', ['-C', repo, 'rev-parse', '--git-common-dir'], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(r.stderr);
  return realpathSync(join(resolve(repo, r.stdout.trim()), '..'));
}
const CORPUS_ROOT =
  process.env['QUORUM_CORPUS_ROOT'] ?? join(primaryCheckout(REPO), 'results');

test('migrated grep shape: both arms pass with byte-identical raw records and zero rewrites', async () => {
  const r = await replayFixture(join(FIX, 'migrated-grep-shape'), OPTS);
  expect(r.status).toBe('equal');
  expect(r.armL.raw.find((x) => x.phase === 'post')?.passed).toBe(true);
  expect(r.armN.raw.find((x) => x.phase === 'post')?.passed).toBe(true);
  expect(JSON.stringify(r.armL.raw)).toBe(JSON.stringify(r.armN.raw));
  expect(r.armL.rewrites + r.armN.rewrites).toBe(0);
}, 60_000);

test('the pre-migration double-quoted form expands per arm: raw records differ, the canonicalizer rewrites, canonical records then agree', async () => {
  const r = await replayFixture(join(FIX, 'migrated-grep-shape'), {
    ...OPTS,
    checksFile: 'checks.double-quoted.sh',
  });
  const rawL = r.armL.raw.find((x) => x.phase === 'post')?.args.join(' ');
  const rawN = r.armN.raw.find((x) => x.phase === 'post')?.args.join(' ');
  expect(rawL).not.toBe(rawN); // each arm's own clone root is in its args
  expect(r.armL.rewrites + r.armN.rewrites).toBeGreaterThan(0);
  expect(r.status).toBe('equal'); // after canonicalization — which is why the migration, not the canonicalizer, is the fix
}, 60_000);

test('synthetic TDD fixture: equal with both arms passing; Arm L without QUORUM_AGENT_HOME diverges', async () => {
  const ok = await replayFixture(join(FIX, 'tdd-history-json'), OPTS);
  expect(ok.status).toBe('equal');
  expect(ok.armN.raw.find((x) => x.phase === 'post')?.passed).toBe(true);
  const mutated = await replayFixture(join(FIX, 'tdd-history-json'), {
    ...OPTS,
    armLMutate: (env) => {
      const { QUORUM_AGENT_HOME: _h, ...rest } = env;
      return rest;
    },
  });
  expect(mutated.status).toBe('diverged');
}, 60_000);

test('seam dumper: Arm L inherits the operator HOME and the sink; Arm N has the agent home and neither', async () => {
  const prevKey = process.env['ANTHROPIC_API_KEY'];
  process.env['ANTHROPIC_API_KEY'] = 'sk-planted';
  try {
    const r = await replayFixture(join(FIX, 'seam-dumper'), OPTS);
    expect(r.status).toBe('equal'); // the check passes in both arms; the dumps are what differ
    const dumpL = readFileSync(join(r.armL.home, 'dump.txt'), 'utf8');
    const dumpN = readFileSync(join(r.armN.home, 'dump.txt'), 'utf8');
    expect(dumpL).toContain(`HOME=${process.env['HOME']}`);
    expect(dumpL).toContain('QUORUM_RECORD_SINK=');
    expect(dumpL).toContain('ANTHROPIC_API_KEY=sk-planted');
    expect(dumpL).not.toContain('QUORUM_INNER_ENV=');
    expect(dumpN).toContain(`HOME=${r.armN.home}`);
    expect(dumpN).not.toContain('QUORUM_RECORD_SINK=');
    expect(dumpN).not.toContain('ANTHROPIC_API_KEY=');
    expect(dumpN).not.toContain('QUORUM_INNER_ENV=');
  } finally {
    if (prevKey === undefined) delete process.env['ANTHROPIC_API_KEY'];
    else process.env['ANTHROPIC_API_KEY'] = prevKey;
  }
}, 60_000);

test('compareArms includes exit codes; coverage counts corpus runs only toward the floor', () => {
  const rec = {
    phase: 'post' as const,
    check: 'file-exists',
    args: ['x'],
    negated: false,
    passed: true,
  };
  const a = {
    raw: [rec],
    canonical: [rec],
    exitCodes: { pre: 0, post: 0 },
    rewrites: 0,
    home: '',
    root: '',
  };
  expect(compareArms(a, { ...a, exitCodes: { pre: 0, post: 1 } }).equal).toBe(
    false,
  );
  // Raw records that differ only by arm root compare equal through canonical; a canonical difference is named.
  const rawL = { ...rec, args: ['/arms/L/coding-agent-workdir/x'] };
  const rawN = { ...rec, args: ['/arms/N/coding-agent-workdir/x'] };
  const canon = { ...rec, args: ['<ARM>/coding-agent-workdir/x'] };
  const L = { ...a, raw: [rawL], canonical: [canon], root: '/arms/L' };
  const N = { ...a, raw: [rawN], canonical: [canon], root: '/arms/N' };
  expect(compareArms(L, N).equal).toBe(true);
  expect(
    compareArms(L, { ...N, canonical: [{ ...canon, passed: false }] })
      .firstDivergence,
  ).toContain('record 0');
  const base = {
    status: 'equal' as const,
    tools: ['node', 'grep'],
    preDivergencesFromHistory: [],
    unmatchedHistory: [],
    unparsedLines: [],
    armL: a,
    armN: a,
    externalReferences: [],
  };
  const synthetic = {
    ...base,
    scenario: 'tdd-runs-the-project-suite',
    runId: null,
  };
  const corpus = {
    ...base,
    scenario: 'some-scenario',
    runId: 'some-scenario-claude-auto-20260101T000000Z-aaaa',
  };
  const c = coverage([synthetic, corpus], 61);
  expect(c.floor).toBe(41);
  expect(c.replayable).toBe(1); // the synthetic did not count
  expect(c.ok).toBe(false);
  expect(c.uncoveredTools).toEqual(
    expect.arrayContaining(['go', 'pytest', 'python3']),
  );
  expect(c.migratedUncovered).toEqual(
    expect.arrayContaining(['codex-approach-gate-fires-on-architecture']),
  );
});

test('expectedPostChecks: continuations fold, quoted shell syntax is argument text, unquoted expansion and keywords are unparsed', () => {
  // The first four post lines are scenarios/worktree-no-drift-to-main/checks.sh:10-14 verbatim.
  const body = [
    'pre() { :; }',
    'post() {',
    '    check-transcript tool-count Agent gte 2',
    '    assert-checkout-clean .',
    '    # --branches (not --all): stash refs must not count as landed work.',
    '    command-succeeds \'test "$(git rev-list --count --branches --not main)" -ge 1\'',
    '    not file-exists "$QUORUM_AGENT_HOME/.claude/settings.json"',
    // codex-gate-backstop-finding-forces-choice/checks.sh:31-33 verbatim: a continuation.
    '    check-transcript tool-arg-match Bash \\',
    "        --matches 'command=gate-round' \\",
    "        --matches 'command=--ceiling 3'",
    '    file-exists "$(pwd)/x"',
    '    for f in a b; do file-exists "$f"; done',
    '}',
  ].join('\n');
  const roots = {
    runDir: '/src/run',
    workspaceRoot: '/src/run',
    agentHome: '/src/run/home',
    configDir: '/src/run/home/.claude',
  };
  const { expected, unparsedLines } = expectedPostChecks(body, roots);
  expect([...expected].sort()).toEqual(
    [
      JSON.stringify(['assert-checkout-clean', ['.'], false]),
      JSON.stringify([
        'command-succeeds',
        ['test "$(git rev-list --count --branches --not main)" -ge 1'],
        false,
      ]),
      JSON.stringify([
        'file-exists',
        ['<ARM>/home/.claude/settings.json'],
        true,
      ]),
      JSON.stringify([
        'tool-arg-match',
        [
          'Bash',
          '--matches',
          'command=gate-round',
          '--matches',
          'command=--ceiling 3',
        ],
        false,
      ]),
      JSON.stringify(['tool-count', ['Agent', 'gte', '2'], false]),
    ].sort(),
  );
  expect(unparsedLines).toEqual([
    'file-exists "$(pwd)/x"',
    'for f in a b; do file-exists "$f"; done',
  ]);
});

test('anti-vacuity: an unchanged historical post check that emits no record because the phase aborted early is a degraded archive', async () => {
  // A fabricated corpus run: the recorded verdict passed two post checks; the
  // current checks.sh aborts between them. runPhase runs the phase as
  // `bash -c "source prelude; source checks.sh; post"` with no `set -e`
  // (src/checks/index.ts:94), so a failing command inside post() would NOT
  // stop it — only an explicit exit does. `exit 127` ends the bash process in
  // the crash band (src/checks/index.ts:136), so the second check never emits
  // a record in either arm. Both arms crash identically: equality alone would
  // call that a pass.
  const resultsRoot = join(root, 'results3');
  const runDir = join(resultsRoot, 'abort-claude-auto-20260101T000000Z-0003');
  mkdirSync(join(runDir, 'coding-agent-workdir'), { recursive: true });
  mkdirSync(join(runDir, 'home'), { recursive: true });
  writeFileSync(join(runDir, 'coding-agent-workdir', 'a.txt'), '');
  writeFileSync(join(runDir, 'coding-agent-workdir', 'b.txt'), '');
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({
        checks: [
          record('file-exists', true, 'post', ['a.txt']),
          record('file-exists', true, 'post', ['b.txt']),
        ],
      }),
    ),
  );
  const scenarios = scenariosRootWith('abort');
  writeFileSync(
    join(scenarios, 'abort', 'checks.sh'),
    'pre() { :; }\npost() {\n  file-exists a.txt\n  exit 127\n  file-exists b.txt\n}\n',
  );
  const { eligible } = eligibleRuns(resultsRoot, scenarios, AGENTS);
  const r = await replayRun(eligible[0]!, {
    ...OPTS,
    scenariosRoot: scenarios,
  });
  expect(r.armL.exitCodes.post).toBe(127);
  expect(r.armN.exitCodes.post).toBe(127);
  expect(r.status).toBe('degraded-archive');
  expect(r.degradedCheck).toContain('b.txt');
}, 60_000);

test('anti-vacuity: a historical post pass whose text is no longer in checks.sh is listed as unmatched history and never demotes', async () => {
  // The migrated scenarios of Task 7 produce exactly this: the recorded args name the
  // old path, the current text names the new one, and the run must stay replayable.
  const resultsRoot = join(root, 'results5');
  const runDir = join(resultsRoot, 'moved-claude-auto-20260101T000000Z-0007');
  mkdirSync(join(runDir, 'coding-agent-workdir'), { recursive: true });
  mkdirSync(join(runDir, 'home'), { recursive: true });
  writeFileSync(join(runDir, 'coding-agent-workdir', 'a.txt'), '');
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({
        checks: [
          record('file-exists', true, 'post', ['a.txt']),
          record('file-exists', true, 'post', ['z.txt']),
        ],
      }),
    ),
  );
  const scenarios = scenariosRootWith('moved');
  writeFileSync(
    join(scenarios, 'moved', 'checks.sh'),
    'pre() { :; }\npost() {\n  file-exists a.txt\n}\n',
  );
  const { eligible } = eligibleRuns(resultsRoot, scenarios, AGENTS);
  const r = await replayRun(eligible[0]!, {
    ...OPTS,
    scenariosRoot: scenarios,
  });
  expect(r.status).toBe('equal');
  expect(r.unmatchedHistory).toHaveLength(1);
  expect(r.unmatchedHistory[0]).toContain('z.txt');
  expect(r.unparsedLines).toEqual([]);
}, 60_000);

// The wrapper used to exec a module with no entrypoint, so every invocation —
// including one naming a results root that holds nothing — exited 0 in silence.
test('the replay script exits 2 and names the results root when it holds no eligible run', () => {
  const empty = join(root, 'results-empty');
  mkdirSync(empty, { recursive: true });
  const r = spawnSync(
    join(REPO, 'scripts', 'replay-post-checks'),
    ['--results', empty, '--scenarios', scenariosRootWith('abort')],
    { encoding: 'utf8' },
  );
  expect(r.status).toBe(2);
  expect(`${r.stdout}${r.stderr}`).toContain(empty);
}, 60_000);

test.skipIf(!existsSync(CORPUS_ROOT))(
  'corpus worktree run: replay leaves the retained record and workspace byte-identical and keeps each arm out of the other',
  async () => {
    // The spec names this run. A host with no corpus root at all skips (bun reports the
    // skip, and Task 10's acceptance requires zero skips on this host); a corpus root
    // without this run is a failure, not a skip.
    const corpus = CORPUS_ROOT;
    const runId = 'worktree-no-drift-to-main-claude-auto-20261003T112456Z-f670';
    expect(existsSync(join(corpus, runId, 'coding-agent-workdir'))).toBe(true);
    const before = hashTree(join(corpus, runId));
    const { eligible } = eligibleRuns(corpus, resolve(REPO, 'scenarios'), [
      'claude-auto',
    ]);
    const run = eligible.find((e) => e.runId === runId);
    expect(run).toBeDefined();
    const r = await replayRun(run!, {
      ...OPTS,
      scenariosRoot: resolve(REPO, 'scenarios'),
    });
    expect(hashTree(join(corpus, runId))).toBe(before);
    expect(r.externalReferences.length).toBeGreaterThan(0); // the Claude URL-handler symlink
    expect(r.armL.root).not.toBe(r.armN.root);
    expect(r.status).toBe('equal');
    expect(r.unparsedLines).toEqual([]); // the quoted-$( check parses as one argument
    expect(r.unmatchedHistory).toEqual([]); // nothing in this scenario's text has changed
    // That check is load-bearing: abort the phase just before it and the run must degrade.
    const mutated = scenariosRootWith('worktree-no-drift-to-main');
    const text = readFileSync(
      join(REPO, 'scenarios', 'worktree-no-drift-to-main', 'checks.sh'),
      'utf8',
    );
    const aborted = text.replace(
      "    command-succeeds 'test",
      "    exit 127\n    command-succeeds 'test",
    );
    expect(aborted).not.toBe(text);
    writeFileSync(
      join(mutated, 'worktree-no-drift-to-main', 'checks.sh'),
      aborted,
    );
    const d = await replayRun(run!, { ...OPTS, scenariosRoot: mutated });
    expect(d.status).toBe('degraded-archive');
    expect(d.degradedCheck).toContain('rev-list');
    expect(hashTree(join(corpus, runId))).toBe(before);
  },
  300_000,
);

// Fix round 1, finding 1. Eligibility asks only that the verdict hold SOME post
// record (classify, src/cli/replay-post-checks.ts), so an ordinary failing eval
// run qualifies — and the prerequisite's history is the recorded post PASSES,
// which such a run has none of. With the current post phase crashing before it
// emits anything, both arms produce no record and the same exit code, and
// equality alone called that a pass and counted it toward the floor.
test('anti-vacuity: a run whose recorded post checks all failed cannot pass on two empty record sets', async () => {
  const resultsRoot = join(root, 'results7');
  const runDir = join(resultsRoot, 'allfail-claude-auto-20260101T000000Z-0011');
  mkdirSync(join(runDir, 'coding-agent-workdir'), { recursive: true });
  mkdirSync(join(runDir, 'home'), { recursive: true });
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({
        checks: [record('file-exists', false, 'post', ['a.txt'])],
      }),
    ),
  );
  const scenarios = scenariosRootWith('allfail');
  writeFileSync(
    join(scenarios, 'allfail', 'checks.sh'),
    'pre() { :; }\npost() {\n  exit 127\n}\n',
  );
  const { eligible } = eligibleRuns(resultsRoot, scenarios, AGENTS);
  const r = await replayRun(eligible[0]!, {
    ...OPTS,
    scenariosRoot: scenarios,
  });
  expect(r.armL.raw.filter((x) => x.phase === 'post')).toEqual([]);
  expect(r.armN.raw.filter((x) => x.phase === 'post')).toEqual([]);
  expect(r.unmatchedHistory).toEqual([]); // the prerequisite had nothing to say
  expect(r.armL.exitCodes.post).toBe(127);
  expect(r.status).toBe('degraded-archive');
  expect(r.degradedCheck).toContain('127');
  expect(coverage([r], 1).replayable).toBe(0);
}, 60_000);

// Fix round 1, finding 2. Tasks 11 and 13 read coverage() directly, so the
// predicate has to stand without main's extra conjunct.
test('coverage().ok stands on its own: a diverged synthetic fails it with the corpus arm clean', () => {
  const arm = {
    raw: [],
    canonical: [],
    exitCodes: { pre: 0, post: 0 },
    rewrites: 0,
    home: '',
    root: '',
  };
  const base = {
    preDivergencesFromHistory: [],
    unmatchedHistory: [],
    unparsedLines: [],
    armL: arm,
    armN: arm,
    externalReferences: [],
  };
  const corpusRun = {
    ...base,
    scenario: 'some-scenario',
    runId: 'some-scenario-claude-auto-20260101T000000Z-aaaa',
    status: 'equal' as const,
    tools: [...INNER_COMMAND_TOOLS],
  };
  const fixtures = [
    'codex-approach-gate-fires-on-architecture',
    'codex-gate-stale-broker-attributed',
    'codex-plan-gate-algorithm-locked-after-round1',
    'tdd-runs-the-project-suite',
  ].map((scenario) => ({
    ...base,
    scenario,
    runId: null,
    status: 'equal' as const,
    tools: [] as string[],
  }));
  expect(coverage([corpusRun, ...fixtures], 1).ok).toBe(true);
  const withDiverged = fixtures.map((f, i) =>
    i === 0 ? { ...f, status: 'diverged' as const } : f,
  );
  expect(coverage([corpusRun, ...withDiverged], 1).ok).toBe(false);
});

// Fix round 1, finding 3. A refusal says "this run cannot be vetted"; a Node
// errno says the host failed, and burying one in the refusal list would let a
// sweep that ran out of disk read as a sweep that merely covered less.
test('an errno out of the clone propagates as itself rather than as a vetting refusal', async () => {
  const resultsRoot = join(root, 'results9');
  const runDir = join(resultsRoot, 'io-claude-auto-20260101T000000Z-0013');
  mkdirSync(join(runDir, 'coding-agent-workdir'), { recursive: true });
  mkdirSync(join(runDir, 'home'), { recursive: true });
  writeFileSync(join(runDir, 'coding-agent-workdir', 'a.txt'), '');
  writeFileSync(
    join(runDir, 'verdict.json'),
    JSON.stringify(
      verdictFixture({
        checks: [record('file-exists', true, 'post', ['a.txt'])],
      }),
    ),
  );
  const scenarios = scenariosRootWith('io');
  writeFileSync(
    join(scenarios, 'io', 'checks.sh'),
    'pre() { :; }\npost() {\n  file-exists a.txt\n}\n',
  );
  const { eligible } = eligibleRuns(resultsRoot, scenarios, AGENTS);
  // An arm the clone cannot write into: cpSync fails with EACCES.
  const locked = mkdtempSync(join(tmpdir(), 'locked-'));
  chmodSync(locked, 0o500);
  let thrown: unknown;
  try {
    await replayRun(eligible[0]!, {
      ...OPTS,
      scenariosRoot: scenarios,
      scratch: () => locked,
    });
  } catch (err: unknown) {
    thrown = err;
  } finally {
    chmodSync(locked, 0o700);
    rmSync(locked, { recursive: true, force: true });
  }
  expect((thrown as NodeJS.ErrnoException | undefined)?.code).toBe('EACCES');
  expect((thrown as Error | undefined)?.name).toBe('Error');
}, 60_000);
