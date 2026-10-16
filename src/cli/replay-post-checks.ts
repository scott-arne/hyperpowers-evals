// Offline replay of recorded post-checks — part one: which recorded runs can be
// replayed, and how one run's workspace is cloned into an isolated arm.
//
// The retained corpus is evidence: a replay reads it and never writes to it.
// Every function here treats `resultsRoot` as read-only, and the clone is the
// delicate part — a recorded workspace carries absolute pointers (linked-worktree
// administrative files, absolute symlinks into the agent's home) that name the
// source, and the obvious repairs send git straight back there. The invariants:
// the clone never spawns git at all, and after a clone no pointer of any class
// resolves out of the arm and into it.
//
// The clone used to hand the arm to `git worktree repair`. Every input to that
// spawn is a file under a copied, agent-authored `.git` — the worktree's
// backlink, each administrative entry, `commondir`, `config` and whatever it
// includes — and five of them were found, one at a time, to redirect where the
// repair writes: into the retained source, or into a repository elsewhere on
// the host. So the clone now rewrites the two pointer files per linked worktree
// itself, with the bytes git would have written, on paths it has vetted.

import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import type { FinalVerdict } from '../contracts/verdict.ts';
import { FinalVerdictSchema } from '../contracts/verdict.ts';
import { parseRunDirName } from '../dashboard/scan.ts';

// ---------------------------------------------------------------------------
// eligibility
// ---------------------------------------------------------------------------

// A recorded run the replay can re-run post-checks against. `runDir` is the
// record; `workspaceRoot` is whichever directory holds `coding-agent-workdir`,
// which the layouts spell differently.
export interface EligibleRun {
  scenario: string;
  runId: string;
  runDir: string;
  workspaceRoot: string;
  layout: 'legacy' | 'relocated';
}

// A scenario the replay has to skip, and why.
export interface Ineligible {
  scenario: string;
  reason:
    | 'no-run'
    | 'setup-stage-verdict'
    | 'no-post-records'
    | 'stripped-workspace';
  runId?: string;
}

type IneligibleReason = Ineligible['reason'];

interface Candidate {
  runId: string;
  started_at: string;
  nonce: string;
}

// Immediate child dirs of `root` that hold a story.md (mirrors `quorum list`
// and the run-all scenario discovery — only dirs can hold the file).
function scenarioNames(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root)
    .filter((name) => existsSync(join(root, name, 'story.md')))
    .sort();
}

function isDirectory(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isDirectory() === true;
}

// Newest first by the run dir's own timestamp, then by nonce, so two runs that
// started in the same second still order deterministically.
function newestFirst(a: Candidate, b: Candidate): number {
  if (a.started_at !== b.started_at) {
    return a.started_at < b.started_at ? 1 : -1;
  }
  if (a.nonce !== b.nonce) {
    return a.nonce < b.nonce ? 1 : -1;
  }
  return 0;
}

function readVerdict(path: string): FinalVerdict | null {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = FinalVerdictSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

// The recorded workspace for a run, in whichever layout wrote it: a run from
// before the relocation keeps it inside the record, a later one keeps it at
// results/workspaces/<run>.
function workspaceFor(
  resultsRoot: string,
  runId: string,
): { workspaceRoot: string; layout: 'legacy' | 'relocated' } | null {
  const legacy = join(resultsRoot, runId);
  if (isDirectory(join(legacy, 'coding-agent-workdir'))) {
    return { workspaceRoot: legacy, layout: 'legacy' };
  }
  const relocated = join(resultsRoot, 'workspaces', runId);
  if (isDirectory(join(relocated, 'coding-agent-workdir'))) {
    return { workspaceRoot: relocated, layout: 'relocated' };
  }
  return null;
}

// The four eligibility tests, applied in the order their demotion reasons are
// reported. A verdict that is missing or unparseable reports as
// `no-post-records`: the record is the only place post-check records live, so a
// run whose record cannot be read has none to replay.
function classify(
  resultsRoot: string,
  scenario: string,
  runId: string,
): EligibleRun | IneligibleReason {
  const runDir = join(resultsRoot, runId);
  const verdict = readVerdict(join(runDir, 'verdict.json'));
  if (verdict === null) {
    return 'no-post-records';
  }
  if (verdict.error?.stage === 'setup') {
    return 'setup-stage-verdict';
  }
  if (!verdict.checks.some((check) => check.phase === 'post')) {
    return 'no-post-records';
  }
  const workspace = workspaceFor(resultsRoot, runId);
  if (workspace === null) {
    return 'stripped-workspace';
  }
  return {
    scenario,
    runId,
    runDir,
    workspaceRoot: workspace.workspaceRoot,
    layout: workspace.layout,
  };
}

// One replayable run per scenario, newest first, with a reason for every
// scenario that has none. `knownAgents` is what parseRunDirName needs to split
// `<scenario>-<agent>` apart; `scenariosRoot` is what makes `no-run` reportable.
export function eligibleRuns(
  resultsRoot: string,
  scenariosRoot: string,
  knownAgents: readonly string[],
): { eligible: EligibleRun[]; ineligible: Ineligible[] } {
  const byScenario = new Map<string, Candidate[]>();
  if (existsSync(resultsRoot)) {
    for (const entry of readdirSync(resultsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const parsed = parseRunDirName(entry.name, knownAgents);
      if (parsed === null) {
        continue;
      }
      const runs = byScenario.get(parsed.scenario) ?? [];
      runs.push({
        runId: entry.name,
        started_at: parsed.started_at,
        nonce: parsed.nonce,
      });
      byScenario.set(parsed.scenario, runs);
    }
  }

  const eligible: EligibleRun[] = [];
  const ineligible: Ineligible[] = [];
  for (const scenario of scenarioNames(scenariosRoot)) {
    const runs = (byScenario.get(scenario) ?? []).sort(newestFirst);
    const newest = runs[0];
    if (newest === undefined) {
      ineligible.push({ scenario, reason: 'no-run' });
      continue;
    }
    const newestOutcome = classify(resultsRoot, scenario, newest.runId);
    if (typeof newestOutcome !== 'string') {
      eligible.push(newestOutcome);
      continue;
    }
    // The newest candidate's first failing test is the scenario's demotion
    // reason, but an older run may still be replayable and is used instead.
    let fallback: EligibleRun | undefined;
    for (const run of runs.slice(1)) {
      const outcome = classify(resultsRoot, scenario, run.runId);
      if (typeof outcome !== 'string') {
        fallback = outcome;
        break;
      }
    }
    if (fallback === undefined) {
      ineligible.push({
        scenario,
        reason: newestOutcome,
        runId: newest.runId,
      });
    } else {
      eligible.push(fallback);
    }
  }
  return { eligible, ineligible };
}

// ---------------------------------------------------------------------------
// cloning a workspace into an isolated arm
// ---------------------------------------------------------------------------

// What the clone found: the git pointer files it validated, the intra-source
// symlinks it re-aimed at the arm, and the symlinks that leave the workspace
// altogether. The last class is reported, never rewritten — the replay has no
// standing to redirect a reference to something outside the run.
export interface PointerReport {
  gitPointers: string[];
  rewrittenSymlinks: string[];
  externalReferences: string[];
}

// Entries of a legacy run directory that belong to the workspace rather than to
// the record: the workdir, any linked-worktree sibling, the agent's home, and
// the package.json sentinel that ends Node's module-type walk. A relocated run
// has nothing else under its workspace root, so every entry is copied.
function isWorkspaceEntry(name: string): boolean {
  return (
    name === 'home' ||
    name === 'package.json' ||
    name.startsWith('coding-agent-workdir')
  );
}

// Depth-first over `root`, never following a symlink: entry types come from the
// directory read, so a symlink to a directory is a leaf and a link loop cannot
// trap the walk.
function walk(
  root: string,
  visit: (path: string, entry: Dirent) => void,
): void {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    visit(path, entry);
    if (entry.isDirectory()) {
      walk(path, visit);
    }
  }
}

function walkSymlinks(root: string): string[] {
  const out: string[] = [];
  walk(root, (path, entry) => {
    if (entry.isSymbolicLink()) {
      out.push(path);
    }
  });
  return out;
}

function walkFiles(
  root: string,
  predicate: (path: string) => boolean,
): string[] {
  const out: string[] = [];
  walk(root, (path, entry) => {
    if (entry.isFile() && predicate(path)) {
      out.push(path);
    }
  });
  return out;
}

// Where a path really lands: `..` collapsed by resolve, then every symlink
// component resolved by taking the realpath of the deepest ancestor that
// exists and re-appending the rest. Containment decided on path text alone is
// not enough — `<arm>/../x` reads as inside the arm, `/results/other/../<run>`
// reads as outside the source, and a link through an external directory can
// lead back into either.
function resolveThrough(target: string): string {
  const absolute = resolve(target);
  let existing = absolute;
  const missing: string[] = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) {
      return absolute; // nothing along the path exists; text is all there is
    }
    missing.unshift(basename(existing));
    existing = parent;
  }
  const real = realpathSync(existing);
  return missing.length === 0 ? real : join(real, ...missing);
}

function contains(root: string, path: string): boolean {
  return path === root || path.startsWith(root + sep);
}

// The part of `target` below the source, or null when it lands anywhere else.
// The answer is about where the path resolves, not how it is spelled.
function sourceRelative(target: string, srcRoot: string): string | null {
  const resolved = resolveThrough(target);
  if (resolved === srcRoot) {
    return '';
  }
  if (contains(srcRoot, resolved)) {
    return relative(srcRoot, resolved);
  }
  return null;
}

export function cloneWorkspace(run: EligibleRun, dest: string): PointerReport {
  const srcRoot = realpathSync(resolve(run.workspaceRoot));

  mkdirSync(dest, { recursive: true });
  // Reported paths use the arm's spelling as given; pointers are written and
  // tested against its realpath, which is also the spelling git writes.
  const destAbs = resolve(dest);
  const destReal = realpathSync(destAbs);
  const insideArm = (path: string): boolean =>
    contains(destReal, resolveThrough(path));

  // The source is read, never written and never handed to git. Symlinks are
  // copied verbatim so their targets can be classified below rather than
  // silently resolved by the copy.
  for (const name of readdirSync(srcRoot)) {
    if (run.layout === 'legacy' && !isWorkspaceEntry(name)) {
      continue;
    }
    cpSync(join(srcRoot, name), join(destAbs, name), {
      recursive: true,
      verbatimSymlinks: true,
      errorOnExist: true,
      force: false,
    });
  }

  const report: PointerReport = {
    gitPointers: [],
    rewrittenSymlinks: [],
    externalReferences: [],
  };

  // Re-aim absolute symlinks that land in the source at the arm; report the
  // rest. A relative link addressed something by its distance from the link,
  // which the copy preserved, so it is rewritten only by leaving it alone —
  // but it is still reported when that distance now reaches out of the arm.
  for (const link of walkSymlinks(destAbs)) {
    const target = readlinkSync(link);
    if (!isAbsolute(target)) {
      if (!insideArm(resolve(dirname(link), target))) {
        report.externalReferences.push(link);
      }
      continue;
    }
    const rel = sourceRelative(target, srcRoot);
    if (rel === null) {
      report.externalReferences.push(link);
      continue;
    }
    // The same climb that takes a target out of the source, and any symlink
    // along the way, can take the rewritten link out of the arm. Nothing here
    // may plant a link the arm does not contain.
    const rewritten = join(destReal, rel);
    if (!insideArm(rewritten)) {
      throw new Error(`${link} cannot be rewritten inside the arm: ${target}`);
    }
    unlinkSync(link);
    symlinkSync(rewritten, link);
    report.rewrittenSymlinks.push(link);
  }

  repairWorktrees(destAbs, destReal, srcRoot, insideArm);

  // Every git pointer in the arm resolves inside the arm. The value can be
  // relative — a submodule's is, and so is every pointer git wrote for a
  // worktree added with --relative-paths — so it is resolved against the
  // directory of the file that holds it.
  for (const path of walkFiles(
    destAbs,
    (file) => basename(file) === '.git' || basename(file) === 'gitdir',
  )) {
    const value = readFileSync(path, 'utf8')
      .trim()
      .replace(/^gitdir: /, '');
    const resolved = isAbsolute(value) ? value : resolve(dirname(path), value);
    if (!insideArm(resolved)) {
      throw new Error(`${path} points outside the arm: ${value}`);
    }
    report.gitPointers.push(path);
  }

  // And no pointer of any class resolves back into the source.
  for (const link of walkSymlinks(destAbs)) {
    const target = readlinkSync(link);
    const absolute = isAbsolute(target)
      ? target
      : resolve(dirname(link), target);
    if (sourceRelative(absolute, srcRoot) !== null) {
      throw new Error(`${link} still points into the source`);
    }
  }
  return report;
}

// A workspace entry can itself be a symlink, which the copy kept verbatim.
// Before the repair reads, deletes or writes anything, every path it works
// through must really be in the arm — `coding-agent-workdir`, its `.git`, the
// `worktrees` directory, and each administrative entry with its pointer file.
// Any of them resolving outside the arm would send readdir, readFileSync and
// writeFileSync at a tree the replay does not own, and hashTree would not show
// the damage, because it does not follow links either.
function requireStructureInsideArm(destReal: string, paths: string[]): void {
  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }
    const real = realpathSync(path);
    if (!contains(destReal, real)) {
      throw new Error(`${path} resolves outside the arm: ${real}`);
    }
  }
}

// A gitdir's `commondir` file names the repository the gitdir belongs to, and
// git reads it from any gitdir — the main `.git` included — before refs,
// objects or the administrative set. In the arm the main `.git` must be its
// own common directory and every administrative entry must belong to it:
// anything else makes git, in the arm, read and write a repository that is
// not the arm. Measured on git 2.56 with a `commondir` planted in the main
// `.git`: `git worktree repair` rewrote the gitdir of an entry in the external
// repository it named and, through a second entry there, the SOURCE
// worktree's `.git`. The clone no longer runs that command, but a later replay
// runs git inside the arm's worktrees, and an absolute `commondir` into the
// source would carry every one of those commands to the source's refs and
// objects. The value is read the way git's get_common_dir_noenv() reads it:
// trailing newlines stripped, a relative value joined under the gitdir that
// holds the file, then resolved.
function requireCommonDirIs(gitdir: string, expected: string): void {
  if (!isDirectory(gitdir)) {
    return; // a gitfile or a junk entry has no commondir to read
  }
  const file = join(gitdir, 'commondir');
  const stat = lstatSync(file, { throwIfNoEntry: false });
  if (stat === undefined) {
    return;
  }
  if (!stat.isFile()) {
    throw new Error(`${file} is not a regular file`);
  }
  const value = readFileSync(file, 'utf8').replace(/[\r\n]+$/, '');
  const resolved = resolveThrough(resolve(gitdir, value));
  if (resolved !== resolveThrough(expected)) {
    throw new Error(
      `${file} names a common directory that is not the arm's: ${value}`,
    );
  }
}

// git's read_gitfile_gently() refuses a `.git` file larger than this.
const GITFILE_MAX_SIZE = 1 << 20;

// The worktree-side `.git` is rewritten only when what it records already
// names <id>, the administrative entry that led the clone to it: then the two
// files describe one copied unit, and re-aiming them at the arm's entry is a
// repair. A backlink naming anything else — a decoy entry elsewhere, an entry
// under another name, or no gitfile at all — records a worktree the agent
// pointed somewhere other than this entry, and the clone has no standing to
// re-aim it. The comparison is the one git's infer_backlink() makes, so that
// the arm's pointers mean to git what they meant before the copy: the raw
// text after the last `/`, trailing isspace trimmed, nothing resolved (git
// never resolves this text; a `/.`-suffixed, trailing-slash or symlinked
// spelling whose resolved name is <id> is a different backlink to git). A file
// git would not read as a gitfile at all (no `gitdir: ` prefix, an embedded
// NUL, too large, not a regular file) is refused rather than overwritten.
function requireBacklinkNamesEntry(dotgit: string, id: string): void {
  const stat = statSync(dotgit);
  if (!stat.isFile() || stat.size > GITFILE_MAX_SIZE) {
    throw new Error(`${dotgit} is not a git pointer file`);
  }
  const content = readFileSync(dotgit, 'utf8');
  const slash = content.lastIndexOf('/');
  const named =
    content.startsWith('gitdir: ') && !content.includes('\0') && slash !== -1
      ? content.slice(slash + 1).replace(/[ \t\n\v\f\r]+$/, '')
      : null;
  if (named !== id) {
    throw new Error(
      `${dotgit} does not point back at administrative entry ${id}: ${content.trim()}`,
    );
  }
}

// Point the arm's linked worktrees at the arm. No git runs here: the clone
// writes the two files `git worktree repair` would have written for each
// worktree — `<adminRoot>/<id>/gitdir`, one line naming `<worktree>/.git`, and
// `<worktree>/.git`, one line `gitdir: <adminRoot>/<id>` — with the realpath
// spellings and trailing newline git uses (worktree.c
// write_worktree_linking_files), so that git run later inside the arm reads
// them as its own. Every path written to has been vetted: the entry and its
// pointer file by the structure sweep, the worktree's `.git` by sourceRelative
// and insideArm, and the pair by requireBacklinkNamesEntry. The spawn was
// removed because its inputs were never the vetted paths alone; they were the
// agent's files under `.git`, and `commondir` (checked below for the same
// reason) was the fifth of them found to redirect the write.
function repairWorktrees(
  destAbs: string,
  destReal: string,
  srcRoot: string,
  insideArm: (path: string) => boolean,
): void {
  const main = join(destAbs, 'coding-agent-workdir');
  const mainGitDir = join(main, '.git');
  const adminRoot = join(mainGitDir, 'worktrees');
  requireStructureInsideArm(destReal, [main, mainGitDir, adminRoot]);
  requireCommonDirIs(mainGitDir, mainGitDir);
  if (!existsSync(adminRoot)) {
    return;
  }
  const ids = readdirSync(adminRoot);
  requireStructureInsideArm(
    destReal,
    ids.flatMap((id) => [join(adminRoot, id), join(adminRoot, id, 'gitdir')]),
  );
  for (const id of ids) {
    requireCommonDirIs(join(adminRoot, id), mainGitDir);
  }
  const linked: { entry: string; dotgit: string }[] = [];
  for (const id of ids) {
    const pointer = join(adminRoot, id, 'gitdir');
    if (!existsSync(pointer)) {
      continue; // a stale administrative entry; git prunes these itself
    }
    const recorded = readFileSync(pointer, 'utf8').trim();
    // `git worktree add --relative-paths` records this relative to the entry
    // that holds it, and such a pointer survives the copy intact.
    const gitdir = isAbsolute(recorded)
      ? recorded
      : resolve(dirname(pointer), recorded);
    if (insideArm(gitdir)) {
      continue; // already inside the arm; nothing to repair
    }
    const rel = sourceRelative(gitdir, srcRoot);
    if (rel === null) {
      throw new Error(`unexpected gitdir pointer ${recorded}`);
    }
    // git records <worktree>/.git here; repair takes the worktree itself.
    const mapped = join(destReal, rel);
    if (basename(mapped) !== '.git') {
      throw new Error(`unexpected gitdir pointer ${recorded}`);
    }
    // A pointer under the source can still climb out of it, and the mapped
    // path would then name something beside the arm — never a path to hand
    // `git worktree repair`.
    if (!insideArm(mapped)) {
      throw new Error(`gitdir pointer maps outside the arm: ${recorded}`);
    }
    if (!existsSync(mapped)) {
      // The agent deleted this worktree with `rm -rf` rather than `git
      // worktree remove`, so the administrative entry outlived it. There is
      // no worktree to point at, and the arm's copy of the entry still names
      // the source, so the arm drops the entry git itself would prune.
      rmSync(join(adminRoot, id), { recursive: true, force: true });
      continue;
    }
    requireBacklinkNamesEntry(mapped, id);
    linked.push({ entry: join(adminRoot, id), dotgit: mapped });
  }
  // Every entry is vetted before any pointer is written, so a refusal leaves
  // the arm's copied pointers as they were.
  for (const { entry, dotgit } of linked) {
    const worktreeReal = realpathSync(dirname(dotgit));
    writeFileSync(join(entry, 'gitdir'), `${join(worktreeReal, '.git')}\n`);
    writeFileSync(dotgit, `gitdir: ${realpathSync(entry)}\n`);
  }
}

// ---------------------------------------------------------------------------
// tree hashing
// ---------------------------------------------------------------------------

interface TreeEntry {
  rel: string;
  kind: string;
  body: Buffer;
}

function byRelPath(a: TreeEntry, b: TreeEntry): number {
  if (a.rel === b.rel) {
    return 0;
  }
  return a.rel < b.rel ? -1 : 1;
}

// A sha256 over the sorted (relative path, content) pairs of a tree: regular
// files by content, symlinks by their target string, directories by name alone.
// Nothing is followed, so the hash of a source tree is a statement about that
// tree and not about whatever its links point at.
export function hashTree(root: string): string {
  const entries: TreeEntry[] = [];
  walk(root, (path, entry) => {
    const rel = relative(root, path);
    if (entry.isSymbolicLink()) {
      entries.push({ rel, kind: 'l', body: Buffer.from(readlinkSync(path)) });
    } else if (entry.isDirectory()) {
      entries.push({ rel, kind: 'd', body: Buffer.alloc(0) });
    } else if (entry.isFile()) {
      entries.push({ rel, kind: 'f', body: readFileSync(path) });
    } else {
      // A socket, fifo or device has no content to read; its identity is all
      // the hash can honestly carry.
      entries.push({ rel, kind: 'o', body: Buffer.alloc(0) });
    }
  });
  entries.sort(byRelPath);
  const hash = createHash('sha256');
  for (const entry of entries) {
    hash.update(`${entry.kind} ${entry.rel} ${entry.body.byteLength}\n`);
    hash.update(entry.body);
  }
  return hash.digest('hex');
}
