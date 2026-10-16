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
//
// The arm also carries the agent's git configuration, and a later replay runs
// git inside the arm against it. A `core.worktree` naming the source, a
// `commondir` in a nested repository naming the source's `.git`, an included
// config file, an alternate object store: each was measured to carry that
// git back to the source, so after the copy the clone reads every gitdir's
// configuration with a reader that refuses what it cannot classify, re-aims
// each path that lands in the source at the arm, and refuses each path it
// cannot vet. A gitdir is one the walk recognizes by git's own rule for a
// HEAD, or one an in-arm `.git` file points at — the latter by the pointer's
// declaration alone, sanitized whatever its HEAD holds.
//
// A symlink that leaves the workspace is reported, never rewritten — the
// replay has no standing to redirect it — with one exception: a symlink named
// `.git` or `gitdir` is refused wherever it leads, an external directory
// included. git writes a regular file or a directory under those names and
// never a link, and it follows one, so a link there chooses the repository of
// every later in-arm git command, or the file `git worktree repair` writes,
// from outside everything the clone vets. The general policy for every other
// link is unchanged.

import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import {
  closeSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  readSync,
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
// standing to redirect a reference to something outside the run; an
// alternate object store outside the run is reported there too. A symlink
// named `.git` or `gitdir` is the exception: refused, not reported (see
// pointerFiles).
// `rewrittenConfig` lists, relative to the arm, the config and alternates
// files whose source paths were re-aimed at the arm; it is absent when none
// were.
export interface PointerReport {
  gitPointers: string[];
  rewrittenSymlinks: string[];
  externalReferences: string[];
  rewrittenConfig?: string[];
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

// The regular files under `root` named `.git` or `gitdir` — the two names git
// reads a pointer from — with a symlink under either name refused on sight.
// No git command writes a symlink there: `git init`, `clone`, `worktree add`
// and `submodule add` each create a regular file or a directory. git does
// follow one — read_gitfile_gently() and is_git_directory() stat() the path,
// and `git worktree repair` writes through it — so a link under either name
// decides, from outside everything the clone vets, which repository a later
// in-arm git command uses: the pointer passes read regular files, and the
// symlink passes judge only where the link itself lands. Measured on git 2.56
// at the round-6 head: `<wd>/wt/.git -> ../ptr.txt`, the link inside the arm
// and the file naming the SOURCE `.git`, cloned with nothing reported, and
// `update-ref` run in <arm>/wd/wt wrote the source; a nested repository's
// `.git/worktrees/<id>/gitdir` as a link to an in-arm file naming the SOURCE
// worktree's `.git` cloned too, and `git worktree repair` run in the arm
// rewrote that source file. There is no shape to preserve, so a link is
// refused wherever it resolves — an external directory included, which the
// symlink pass used to report.
function pointerFiles(root: string): string[] {
  const out: string[] = [];
  walk(root, (path, entry) => {
    const name = basename(path);
    if (name !== '.git' && name !== 'gitdir') {
      return;
    }
    if (entry.isSymbolicLink()) {
      throw new Error(
        `${path} is a symlink; git never writes one under that name`,
      );
    }
    if (entry.isFile()) {
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

  // No symlink of any class resolves back into the source, checked before
  // any pass reads through one. The passes below rewrite file contents and
  // plant no link, so this holds at return as well.
  for (const link of walkSymlinks(destAbs)) {
    const target = readlinkSync(link);
    const absolute = isAbsolute(target)
      ? target
      : resolve(dirname(link), target);
    if (sourceRelative(absolute, srcRoot) !== null) {
      throw new Error(`${link} still points into the source`);
    }
  }

  sanitizeGitConfig({ destAbs, destReal, srcRoot, insideArm }, report);

  repairWorktrees(destAbs, destReal, srcRoot, insideArm);

  // Every git pointer in the arm resolves inside the arm. The value can be
  // relative — a submodule's is, and so is every pointer git wrote for a
  // worktree added with --relative-paths — so it is resolved against the
  // directory of the file that holds it. The walk refuses a symlinked `.git`
  // or `gitdir` again here, as the backstop to the discovery pass: no pass in
  // between plants a link, so this holds at return.
  for (const path of pointerFiles(destAbs)) {
    const value = readFileSync(path, 'utf8')
      .trim()
      .replace(/^gitdir: /, '');
    const resolved = isAbsolute(value) ? value : resolve(dirname(path), value);
    if (!insideArm(resolved)) {
      throw new Error(`${path} points outside the arm: ${value}`);
    }
    report.gitPointers.push(path);
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
// objects. Every other gitdir's `commondir` is held inside the arm by
// requireCommonDirInsideArm; these two must be the arm's main `.git` itself.
function requireCommonDirIs(gitdir: string, expected: string): void {
  if (!isDirectory(gitdir)) {
    return; // a gitfile or a junk entry has no commondir to read
  }
  const common = readCommonDir(gitdir);
  if (common !== null && common.resolved !== resolveThrough(expected)) {
    throw new Error(
      `${common.file} names a common directory that is not the arm's: ${common.value}`,
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
// git configuration carried by the arm
// ---------------------------------------------------------------------------

// The arm's spellings and the source, for the passes that classify a path
// named by a file in the arm.
interface ArmContext {
  destAbs: string;
  destReal: string;
  srcRoot: string;
  insideArm: (path: string) => boolean;
}

// git's validate_headref() (path.c) reads at most this many bytes of a HEAD
// and judges those; a longer file is not refused, its start is what counts.
const HEAD_READ_SIZE = 255;

// What validate_headref() accepts in those bytes: `ref:`, C isspace()
// characters, `refs/`; or forty hexadecimal digits in either case. The
// digits are a prefix, not a line: get_oid_hex_any() reads the digits of
// each object id length it knows and ignores whatever follows, so a 64-digit
// SHA-256 id, a 41st digit, a missing newline and trailing text all pass.
// Measured on git 2.56 with GIT_DIR naming a directory holding only this
// HEAD, `objects` and `refs`: every one of those shapes was a repository,
// uppercase ids included; 39 digits, a leading space, `ref: heads/x` and
// an empty file were not.
const GIT_HEAD = /^(?:ref:[ \t\n\v\f\r]*refs\/|[0-9a-fA-F]{40})/;

// git's validate_headref(): a HEAD that is a symlink, or a regular file whose
// first bytes are GIT_HEAD. A directory whose HEAD fails this is not a
// repository to git, however the rest of it is named, so its config cannot
// redirect git — and one whose HEAD passes is, so the predicate has to accept
// every shape git does. It used to take lowercase digits only, and a
// commondir beside an uppercase detached id, naming the source, went
// unchecked by the walk and by the pointer route that shared the gate.
function isGitHead(path: string): boolean {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat === undefined) {
    return false;
  }
  if (stat.isSymbolicLink()) {
    return true;
  }
  if (!stat.isFile()) {
    return false;
  }
  const head = Buffer.alloc(HEAD_READ_SIZE);
  const fd = openSync(path, 'r');
  let length: number;
  try {
    length = readSync(fd, head, 0, HEAD_READ_SIZE, 0);
  } finally {
    closeSync(fd);
  }
  // One byte per character, as git compares them.
  return GIT_HEAD.test(head.toString('latin1', 0, length));
}

// Every gitdir under the arm, found without following a symlink: a directory
// named `.git`; a directory holding a HEAD git would accept together with a
// `config`, a `commondir` (git's rule for a linked worktree's gitdir, which
// keeps no `config`: HEAD there, objects and refs through `commondir`) or an
// `objects` and a `refs` directory (git's rule for a repository, which needs
// no `config` either); and each `worktrees/<id>` and `modules/<name>`
// directory of a gitdir. A `config` alone used to be the sign, and a
// `HEAD`+`commondir` gitdir planted under its own name and reached through a
// `.git` file kept an absolute `commondir` into the source unchecked.
function findGitDirs(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string, known: boolean): void => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const names = new Set(entries.map((entry) => entry.name));
    const gitdir =
      known ||
      basename(dir) === '.git' ||
      ((names.has('config') ||
        names.has('commondir') ||
        (names.has('objects') && names.has('refs'))) &&
        isGitHead(join(dir, 'HEAD')));
    if (gitdir) {
      out.push(dir);
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const child = join(dir, entry.name);
      if (gitdir && (entry.name === 'worktrees' || entry.name === 'modules')) {
        for (const sub of readdirSync(child, { withFileTypes: true })) {
          if (sub.isDirectory()) {
            visit(join(child, sub.name), true);
          }
        }
      } else {
        visit(child, false);
      }
    }
  };
  visit(root, false);
  return out;
}

// The gitdir each `.git` file in the arm names, when that resolves to a
// directory inside the arm. git uses a gitdir wherever a `.git` file points,
// whatever the directory is called and however it is shaped, so the pointers
// are a second route to the set the walk recognizes by shape — and here the
// pointer's declaration is the whole test: its target is sanitized whatever
// its HEAD holds. The walk has nothing but the HEAD to go on, and the HEAD
// gate this route used to share with it let a shape the predicate misjudged
// carry an absolute `commondir` into the source unchecked; a target the
// pointer names is a gitdir on the pointer's word, and the only cost of
// reading one git would reject is a refusal of a `commondir` or config that
// cannot be vetted. The file is read as read_gitfile_gently() reads it — a
// `gitdir: ` prefix, the rest with trailing newlines stripped, relative to
// the file's directory — and the target is resolved and contained in the arm
// before anything under it is read. A target outside the arm is not read
// here: before the repair it is the recorded pointer of a linked worktree,
// and the pointer sweep at the end decides its fate. This is the first pass
// to enumerate the arm's pointer files, so it is where a symlinked `.git` or
// `gitdir` is refused: before the configuration edits and before the repair
// writes a pointer.
function gitfileTargets(destAbs: string, destReal: string): string[] {
  const out: string[] = [];
  for (const file of pointerFiles(destAbs)) {
    if (basename(file) !== '.git') {
      continue;
    }
    if (statSync(file).size > GITFILE_MAX_SIZE) {
      continue; // git refuses to read it as a gitfile
    }
    const content = readFileSync(file, 'utf8');
    if (!content.startsWith('gitdir: ') || content.includes('\0')) {
      continue; // not a gitfile to git
    }
    const value = content.slice('gitdir: '.length).replace(/[\r\n]+$/, '');
    const target = isAbsolute(value) ? value : resolve(dirname(file), value);
    const real = resolveThrough(target);
    if (!contains(destReal, real)) {
      continue;
    }
    if (isDirectory(real)) {
      out.push(real);
    }
  }
  return out;
}

// A gitdir's `commondir`, read the way git's get_common_dir_noenv() reads it:
// trailing newlines stripped, a relative value joined under the gitdir that
// holds the file, then resolved. Null when the gitdir has none.
function readCommonDir(
  gitdir: string,
): { file: string; value: string; resolved: string } | null {
  const file = join(gitdir, 'commondir');
  const stat = lstatSync(file, { throwIfNoEntry: false });
  if (stat === undefined) {
    return null;
  }
  if (!stat.isFile()) {
    throw new Error(`${file} is not a regular file`);
  }
  const value = readFileSync(file, 'utf8').replace(/[\r\n]+$/, '');
  return { file, value, resolved: resolveThrough(resolve(gitdir, value)) };
}

// Any gitdir's common directory must be in the arm. The main `.git` and its
// administrative entries are held to the stricter requireCommonDirIs; this
// one covers the rest — a repository nested in the workdir, a
// `.git/modules/<name>` — where a `commondir` naming the source's `.git`
// would send every ref and object write of a replay's git there. Measured on
// git 2.56: `git -C <arm>/coding-agent-workdir/sub update-ref refs/heads/x
// HEAD` created the ref in the SOURCE `.git`.
function requireCommonDirInsideArm(gitdir: string, destReal: string): void {
  const common = readCommonDir(gitdir);
  if (common !== null && !contains(destReal, common.resolved)) {
    throw new Error(
      `${common.file} names a common directory outside the arm: ${common.value}`,
    );
  }
}

// A file the pass reads and may rewrite: its realpath, when it exists and is
// a regular file the arm contains, decided before anything reads it. The walk
// never followed a link to reach a gitdir, but every component composed
// below one can be a link — the file itself, and `objects` and `info` on the
// way to an alternates file — and a link out of the arm there would have the
// pass read, and then rewrite, a file the replay does not own. Measured at
// the round-6 head, where only a link in the last component was checked:
// `.git/objects` as a relative link climbing into the source had the
// SOURCE's alternates rewritten, and `.git/objects/info` as an absolute link
// to an external directory had that directory's alternates rewritten with
// the clone returning success.
function vetConfigFile(file: string, destReal: string): string | null {
  const real = resolveThrough(file);
  if (!contains(destReal, real)) {
    throw new Error(`${file} resolves outside the arm: ${real}`);
  }
  const stat = statSync(real, { throwIfNoEntry: false });
  if (stat === undefined) {
    return null; // absent, or a dangling link: git reads nothing here either
  }
  if (!stat.isFile()) {
    throw new Error(`${file} is not a regular file`);
  }
  return real;
}

// Where a path named by the arm's configuration lands: inside the arm it
// stays; inside the source it is mapped to the arm the way a symlink target
// is, and can fail the same way; anywhere else the clone has no standing to
// rewrite it, and the caller decides whether that is a refusal (a path git
// would write through, or read configuration from) or a report (an
// alternate, which git only reads objects from).
type Placement =
  | { kind: 'arm' }
  | { kind: 'source'; mapped: string }
  | { kind: 'outside' };

function placeTarget(target: string, ctx: ArmContext): Placement {
  if (ctx.insideArm(target)) {
    return { kind: 'arm' };
  }
  const rel = sourceRelative(target, ctx.srcRoot);
  if (rel === null) {
    return { kind: 'outside' };
  }
  const mapped = join(ctx.destReal, rel);
  if (!ctx.insideArm(mapped)) {
    throw new Error(`${target} cannot be rewritten inside the arm`);
  }
  return { kind: 'source', mapped };
}

// The subset of git's config syntax the clone reads: a `[section]` or
// `[section "subsection"]` header, a `key = value` or bare `key` line whose
// value is plain, a `#` or `;` comment, a blank line. That is every shape
// `git init`, `clone`, `worktree add` and `submodule add` write (measured on
// 2.56, where the last writes a relative `core.worktree`). A quoted value, a
// backslash — an escape, or the line continuation that folds the next line
// into this value — and any other shape are refused rather than guessed at,
// because the pass has to know which line is `core.worktree` and what it
// says. Section and key names compare lowercased, as git reads them.
const CONFIG_BLANK = /^\s*$/;
const CONFIG_COMMENT = /^\s*[#;]/;
const CONFIG_HEADER =
  /^\s*\[([A-Za-z0-9-]+)(?:\s+"([^"\\]*)")?\]\s*(?:[#;].*)?$/;
const CONFIG_ENTRY =
  /^(\s*)([A-Za-z][A-Za-z0-9-]*)(\s*=\s*)([^"\\#;]*?)(\s*(?:[#;].*)?)$/;
const CONFIG_BARE = /^\s*([A-Za-z][A-Za-z0-9-]*)\s*(?:[#;].*)?$/;

interface ConfigEntry {
  line: number;
  section: string;
  subsection: string | null;
  key: string;
  value: string | null; // null for a bare key, which git reads as true
  prefix: string; // the line up to the value, kept when the value is rewritten
  suffix: string; // trailing whitespace and comment, likewise
}

function parseConfig(file: string, lines: string[]): ConfigEntry[] {
  const entries: ConfigEntry[] = [];
  let section = '';
  let subsection: string | null = null;
  for (const [index, line] of lines.entries()) {
    if (CONFIG_BLANK.test(line) || CONFIG_COMMENT.test(line)) {
      continue;
    }
    const header = CONFIG_HEADER.exec(line);
    if (header !== null) {
      section = (header[1] ?? '').toLowerCase();
      subsection = header[2] ?? null;
      continue;
    }
    const entry = CONFIG_ENTRY.exec(line);
    if (entry !== null) {
      entries.push({
        line: index,
        section,
        subsection,
        key: (entry[2] ?? '').toLowerCase(),
        value: entry[4] ?? '',
        prefix: `${entry[1] ?? ''}${entry[2] ?? ''}${entry[3] ?? ''}`,
        suffix: entry[5] ?? '',
      });
      continue;
    }
    const bare = CONFIG_BARE.exec(line);
    if (bare !== null) {
      entries.push({
        line: index,
        section,
        subsection,
        key: (bare[1] ?? '').toLowerCase(),
        value: null,
        prefix: line,
        suffix: '',
      });
      continue;
    }
    throw new Error(
      `${file}:${index + 1}: a git config line the clone cannot read: ${line}`,
    );
  }
  return entries;
}

// A rewritten value goes back unquoted, so it must be one git reads back
// unchanged: no quote, backslash or comment character, no whitespace at
// either end.
function plainValue(value: string, file: string): string {
  if (/["\\#;\r\n]/.test(value) || value.trim() !== value) {
    throw new Error(`${file}: ${value} cannot be written as a plain value`);
  }
  return value;
}

interface ConfigJob {
  file: string;
  gitdir: string;
}

// `core.worktree`: absolute as written, else relative to the gitdir (git
// chdirs to the gitdir and then to the value). Measured on git 2.56 with an
// absolute value naming the source's working tree: `git checkout -- .` run
// inside the arm wrote the SOURCE working tree.
function placeWorktree(
  entry: ConfigEntry,
  file: string,
  gitdir: string,
  ctx: ArmContext,
): string | null {
  if (entry.value === null) {
    throw new Error(`${file}:${entry.line + 1}: core.worktree has no value`);
  }
  const placement = placeTarget(resolve(gitdir, entry.value), ctx);
  if (placement.kind === 'outside') {
    throw new Error(
      `${file}: core.worktree names a working tree outside the arm: ${entry.value}`,
    );
  }
  return placement.kind === 'source' ? placement.mapped : null;
}

// `include.path` and `includeIf.<condition>.path`: relative to the directory
// of the file that holds it; a leading `~/` is git's spelling of HOME, which
// for the agent was `<workspaceRoot>/home`. An included file inside the arm
// is read like a gitdir's own config, since git reads it that way; one
// inside the source is re-aimed at the arm's copy and that copy is read; one
// anywhere else is refused, because the clone cannot vet what it contains.
function placeInclude(
  entry: ConfigEntry,
  file: string,
  gitdir: string,
  ctx: ArmContext,
  queue: ConfigJob[],
): string | null {
  if (entry.value === null) {
    throw new Error(`${file}:${entry.line + 1}: include path has no value`);
  }
  let target: string;
  if (entry.value.startsWith('~')) {
    if (entry.value !== '~' && !entry.value.startsWith('~/')) {
      throw new Error(
        `${file}: include path names another user's home: ${entry.value}`,
      );
    }
    target = join(ctx.srcRoot, 'home', entry.value.slice(1));
    if (!existsSync(target)) {
      throw new Error(
        `${file}: include path ${entry.value} is not under the run's home`,
      );
    }
  } else {
    target = resolve(dirname(file), entry.value);
  }
  const placement = placeTarget(target, ctx);
  if (placement.kind === 'outside') {
    throw new Error(
      `${file}: include path resolves outside the arm: ${entry.value}`,
    );
  }
  if (placement.kind === 'arm') {
    queue.push({ file: resolveThrough(target), gitdir });
    return null;
  }
  queue.push({ file: placement.mapped, gitdir });
  return placement.mapped;
}

// One config file: the two keys that name a path git would then read
// configuration from or write a working tree through are placed, and a line
// that needs re-aiming is rewritten in place, value only. The keys are
// matched as git matches them — `core.worktree` with no subsection,
// `include.path` with none, `includeIf.<condition>.path` with one.
function sanitizeConfigFile(
  file: string,
  gitdir: string,
  ctx: ArmContext,
  queue: ConfigJob[],
  edits: Map<string, string>,
): void {
  const lines = readFileSync(file, 'utf8').split('\n');
  let changed = false;
  for (const entry of parseConfig(file, lines)) {
    let replacement: string | null = null;
    if (entry.key === 'worktree' && entry.section === 'core') {
      if (entry.subsection === null) {
        replacement = placeWorktree(entry, file, gitdir, ctx);
      }
    } else if (entry.key === 'path') {
      const include =
        (entry.section === 'include' && entry.subsection === null) ||
        (entry.section === 'includeif' && entry.subsection !== null);
      if (include) {
        replacement = placeInclude(entry, file, gitdir, ctx, queue);
      }
    }
    if (replacement !== null) {
      lines[entry.line] =
        `${entry.prefix}${plainValue(replacement, file)}${entry.suffix}`;
      changed = true;
    }
  }
  if (changed) {
    edits.set(file, lines.join('\n'));
  }
}

// `objects/info/alternates`: one object store per line, relative to
// `objects/`, `#` lines ignored. git reads objects from an alternate and
// never writes one, so a store in the source is re-aimed at the arm's copy
// and a store elsewhere is reported, not refused. A line git would unquote
// is refused.
function sanitizeAlternates(
  gitdir: string,
  ctx: ArmContext,
  report: PointerReport,
  edits: Map<string, string>,
): void {
  const objects = join(gitdir, 'objects');
  const file = vetConfigFile(join(objects, 'info', 'alternates'), ctx.destReal);
  if (file === null) {
    return;
  }
  const lines = readFileSync(file, 'utf8').split('\n');
  let changed = false;
  let external = false;
  for (const [index, line] of lines.entries()) {
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    if (line.startsWith('"')) {
      throw new Error(`${file}:${index + 1}: a quoted alternate`);
    }
    const placement = placeTarget(resolve(objects, line), ctx);
    if (placement.kind === 'source') {
      lines[index] = placement.mapped;
      changed = true;
    } else if (placement.kind === 'outside') {
      external = true;
    }
  }
  if (changed) {
    edits.set(file, lines.join('\n'));
  }
  if (external) {
    report.externalReferences.push(
      join(ctx.destAbs, relative(ctx.destReal, file)),
    );
  }
}

// The configuration the arm carries can send a later git command, run inside
// the arm, back to the source: this pass reads, for every gitdir the walk
// recognizes or a `.git` file names, its `config` and `config.worktree`,
// what they include, its `commondir` and its alternates, and re-aims or
// refuses each path that leaves the arm. It runs
// after the copy and the symlink rewrite, before any pointer is written, so
// no vetted pointer lands in a repository whose config could still redirect
// it. Nothing is written until every file has been read and classified, so a
// refusal leaves the arm's configuration as the copy made it.
function sanitizeGitConfig(ctx: ArmContext, report: PointerReport): void {
  const edits = new Map<string, string>();
  const seen = new Set<string>();
  const queue: ConfigJob[] = [];
  // Both routes to the gitdirs, each gitdir once, by realpath.
  const gitdirs = new Set<string>();
  for (const dir of findGitDirs(ctx.destAbs)) {
    gitdirs.add(realpathSync(dir));
  }
  for (const dir of gitfileTargets(ctx.destAbs, ctx.destReal)) {
    gitdirs.add(dir);
  }
  const mainGitDir = join(ctx.destAbs, 'coding-agent-workdir', '.git');
  const mainReal = resolveThrough(mainGitDir);
  for (const gitdir of gitdirs) {
    if (
      gitdir === mainReal ||
      dirname(gitdir) === join(mainReal, 'worktrees')
    ) {
      requireCommonDirIs(gitdir, mainGitDir);
    } else {
      requireCommonDirInsideArm(gitdir, ctx.destReal);
    }
    queue.push({ file: join(gitdir, 'config'), gitdir });
    queue.push({ file: join(gitdir, 'config.worktree'), gitdir });
    sanitizeAlternates(gitdir, ctx, report, edits);
  }
  for (let job = queue.pop(); job !== undefined; job = queue.pop()) {
    const file = vetConfigFile(job.file, ctx.destReal);
    if (file === null || seen.has(file)) {
      continue;
    }
    seen.add(file);
    sanitizeConfigFile(file, job.gitdir, ctx, queue, edits);
  }
  // Every key was vetted by vetConfigFile; the record of what is about to be
  // written says so in its own terms, before the first write.
  const rewritten: string[] = [];
  for (const file of edits.keys()) {
    const rel = relative(ctx.destReal, file);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) {
      throw new Error(`${file} is not inside the arm`);
    }
    rewritten.push(rel);
  }
  for (const [file, content] of edits) {
    writeFileSync(file, content);
  }
  if (rewritten.length > 0) {
    report.rewrittenConfig = rewritten.sort();
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
