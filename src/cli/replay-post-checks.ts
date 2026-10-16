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
  mkdtempSync,
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
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { parse as parseYaml } from 'yaml';
import { xdgHomeSubdirs } from '../agents/home-env.ts';
import type { OuterEnvArgs } from '../checks/env-allowlist.ts';
import { outerEnv } from '../checks/env-allowlist.ts';
import type { RunPhaseArgs } from '../checks/index.ts';
import { runPhaseWithEnv } from '../checks/index.ts';
import type { AgentConfig } from '../contracts/agent-config.ts';
import {
  AgentConfigSchema,
  agentConfigDir,
} from '../contracts/agent-config.ts';
import type { CheckRecord, FinalVerdict } from '../contracts/verdict.ts';
import { FinalVerdictSchema } from '../contracts/verdict.ts';
import { parseRunDirName } from '../dashboard/scan.ts';
import { envSnapshot } from '../env.ts';

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
// `externalAlternates` names the object stores an in-arm alternates file
// points at from outside the run, resolved. `externalReferences` can only
// carry the alternates FILE, which is a regular file; what decides whether a
// replay may run is the directory named inside it, so it is reported here.
export interface PointerReport {
  gitPointers: string[];
  rewrittenSymlinks: string[];
  externalReferences: string[];
  rewrittenConfig?: string[];
  externalAlternates?: string[];
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
  const external: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    if (line.startsWith('"')) {
      throw new Error(`${file}:${index + 1}: a quoted alternate`);
    }
    const target = resolve(objects, line);
    const placement = placeTarget(target, ctx);
    if (placement.kind === 'source') {
      lines[index] = placement.mapped;
      changed = true;
    } else if (placement.kind === 'outside') {
      external.push(resolveThrough(target));
    }
  }
  if (changed) {
    edits.set(file, lines.join('\n'));
  }
  if (external.length > 0) {
    report.externalReferences.push(
      join(ctx.destAbs, relative(ctx.destReal, file)),
    );
    report.externalAlternates = [
      ...(report.externalAlternates ?? []),
      ...external,
    ];
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

// ---------------------------------------------------------------------------
// the two arms
// ---------------------------------------------------------------------------
//
// The replay runs the *current* scenario's checks.sh twice over two clones of
// one recorded workspace, under the two post-check environments, and requires
// the two to emit the same records. Arm L is today's construction — the whole
// ambient environment, plus the QUORUM contract — and Arm N is the allowlisted
// one. Nothing else differs, so a difference in the records is the environment
// change and nothing else.
//
// Equality alone would pass vacuously: a phase that aborts before a check, or
// a check whose text has changed since the record was written, fails the same
// way in both arms. The prerequisite below is what keeps that from reading as
// evidence — it is built from the current checks.sh text, independently of
// anything either arm emitted.

/** One record as an arm emitted it. `detail` is dropped: it carries paths and
 *  timings that differ between the arms by construction. */
export interface ArmRecord {
  phase: 'pre' | 'post';
  check: string;
  args: string[];
  negated: boolean;
  passed: boolean;
}

/** One arm's outcome. `canonical` is `raw` with this arm's clone root replaced
 *  by `<ARM>`, which is the form the comparison reads. */
export interface ArmResult {
  raw: ArmRecord[];
  canonical: ArmRecord[];
  exitCodes: { pre: number; post: number };
  rewrites: number;
  home: string;
  root: string;
}

export interface ReplayOptions {
  repoRoot: string;
  scenariosRoot?: string;
  codingAgent?: string;
  agentsDir?: string;
  scratch: () => string;
  checksFile?: string;
}

export interface ReplayResult {
  scenario: string;
  /** null for a synthetic fixture, which stands in for a scenario rather than
   *  replaying a recorded run. */
  runId: string | null;
  status: 'equal' | 'diverged' | 'degraded-archive';
  firstDivergence?: string;
  degradedCheck?: string;
  /** Recorded pre passes the current pre phase fails. Listed, never demoting:
   *  pre runs against the post-agent state, so a difference is expected. */
  preDivergencesFromHistory: string[];
  /** Historical post passes whose current text changed or vanished. Listed,
   *  never demoting: the migrated scenarios land here by design. */
  unmatchedHistory: string[];
  /** post() lines the static scan could not read as a check. */
  unparsedLines: string[];
  /** Leading tokens of the post phase's command-succeeds inner commands. */
  tools: string[];
  armL: ArmResult;
  armN: ArmResult;
  externalReferences: string[];
}

/** Today's construction, reproduced here and only here: the whole ambient
 *  environment plus the QUORUM contract, plus the one variable the migrated
 *  checks need, plus the selector that makes the dispatcher inherit. */
export function legacyOuterEnv(a: OuterEnvArgs): Record<string, string> {
  const base = envSnapshot();
  const env: Record<string, string | undefined> = {
    ...base,
    PATH: base['PATH'] ?? '/usr/bin:/bin',
    QUORUM_REPO_ROOT: a.repoRoot,
    QUORUM_AGENT_HOME: a.agentHome,
    QUORUM_INNER_ENV: 'legacy',
    ...(a.transcriptPath !== undefined
      ? { QUORUM_TRANSCRIPT_PATH: a.transcriptPath }
      : {}),
    ...(a.runDir !== undefined ? { QUORUM_RUN_DIR: a.runDir } : {}),
    ...(a.configDir !== undefined
      ? { QUORUM_AGENT_CONFIG_DIR: a.configDir }
      : {}),
    ...(a.codingAgent !== undefined
      ? { QUORUM_CODING_AGENT: a.codingAgent }
      : {}),
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

/** Replace this arm's clone root — as spelled and as resolved — with `<ARM>`,
 *  so two arms that differ only by where they were cloned compare equal. */
export function canonicalize(
  records: ArmRecord[],
  armRoot: string,
): { records: ArmRecord[]; rewrites: number } {
  let rewrites = 0;
  const real = realpathSync(armRoot);
  const out = records.map((r) => {
    const args = r.args.map((s) =>
      s.split(real).join('<ARM>').split(armRoot).join('<ARM>'),
    );
    if (args.some((s, i) => s !== r.args[i])) {
      rewrites += 1;
    }
    return { ...r, args };
  });
  return { records: out, rewrites };
}

function recordKey(check: string, args: string[], negated: boolean): string {
  return JSON.stringify([check, args, negated]);
}

function describeCheck(
  check: string,
  args: string[],
  negated: boolean,
): string {
  return `${negated ? 'not ' : ''}${check} ${JSON.stringify(args)}`;
}

/** The ordered canonical records and both exit codes, which is the whole of
 *  what the counterfactual claims. */
export function compareArms(
  l: ArmResult,
  n: ArmResult,
): { equal: boolean; firstDivergence?: string } {
  if (
    l.exitCodes.pre !== n.exitCodes.pre ||
    l.exitCodes.post !== n.exitCodes.post
  ) {
    return {
      equal: false,
      firstDivergence: `exit codes L=${JSON.stringify(l.exitCodes)} N=${JSON.stringify(n.exitCodes)}`,
    };
  }
  const key = (r: ArmRecord): string =>
    JSON.stringify([r.phase, r.check, r.args, r.negated, r.passed]);
  const max = Math.max(l.canonical.length, n.canonical.length);
  for (let i = 0; i < max; i++) {
    const a = l.canonical[i];
    const b = n.canonical[i];
    if (a === undefined || b === undefined || key(a) !== key(b)) {
      return {
        equal: false,
        firstDivergence: `record ${i}: L=${a ? key(a) : 'absent'} N=${b ? key(b) : 'absent'}`,
      };
    }
  }
  return { equal: true };
}

/** The agent's YAML read for its shape alone. Deliberately not
 *  `loadAgentConfig`, which validates `required_env` against the live
 *  environment (claude-auto requires SUPERPOWERS_ROOT): an offline replay of a
 *  recorded run must not depend on provider credentials. The replay needs
 *  `home_config_subdir` and nothing live. */
export function offlineAgentConfig(
  agentsDir: string,
  name: string,
): AgentConfig {
  const raw: unknown = parseYaml(
    readFileSync(join(agentsDir, `${name}.yaml`), 'utf8'),
  );
  return AgentConfigSchema.parse(raw);
}

/** The `*.yaml` basenames of an agents dir: what parseRunDirName needs to
 *  split `<scenario>-<agent>` apart. */
function knownAgents(agentsDir: string): string[] {
  if (!existsSync(agentsDir)) {
    return [];
  }
  return readdirSync(agentsDir)
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => name.slice(0, -'.yaml'.length))
    .sort();
}

/** Every tool the shipped inner commands invoke (spec, acceptance (ii)). The
 *  replay must exercise each one in a post phase, by a corpus run or by a
 *  synthetic counterfactual, before its result means anything about them. */
export const INNER_COMMAND_TOOLS: readonly string[] = [
  'grep',
  'test',
  'node',
  'git',
  'find',
  'npm',
  'awk',
  'ls',
  'npx',
  'go',
  'pytest',
  'python3',
];

/** The four scenarios Task 7 moved across the credential boundary. Each must be
 *  covered by a corpus run or, where its archive is degraded, by a synthetic
 *  fixture in the current check format (spec, acceptance (iii)). */
const MIGRATED_SCENARIOS: readonly string[] = [
  'codex-approach-gate-fires-on-architecture',
  'codex-gate-stale-broker-attributed',
  'codex-plan-gate-algorithm-locked-after-round1',
  'tdd-runs-the-project-suite',
];

// A shipped check invokes its tool by path — `./.venv/bin/pytest -q`
// (scenarios/verification-phantom-completion/checks.sh) — and the inventory
// names the tool, so the comparison is between basenames. `tools` keeps the
// leader as the command wrote it, which is what the report should show.
function toolName(leader: string): string {
  return leader.includes('/') ? basename(leader) : leader;
}

/** The predeclared floor, so the gate cannot pass on a shrunken set. Only
 *  corpus runs count toward it; a synthetic fixture is a counterfactual, not a
 *  replay of retained evidence, and still covers a tool or a migrated scenario
 *  the corpus cannot. */
export function coverage(
  results: ReplayResult[],
  eligibleCount: number,
): {
  ok: boolean;
  replayable: number;
  floor: number;
  uncoveredTools: string[];
  migratedUncovered: string[];
} {
  const floor = Math.ceil((eligibleCount * 2) / 3);
  const corpus = results.filter(
    (r) => r.runId !== null && r.status !== 'degraded-archive',
  );
  const covering = results.filter((r) => r.status !== 'degraded-archive');
  const exercised = new Set(covering.flatMap((r) => r.tools.map(toolName)));
  const uncoveredTools = INNER_COMMAND_TOOLS.filter((t) => !exercised.has(t));
  const scenarios = new Set(covering.map((r) => r.scenario));
  const migratedUncovered = MIGRATED_SCENARIOS.filter((s) => !scenarios.has(s));
  return {
    // Every result that counts must be equal, synthetic ones included: Tasks
    // 11 and 13 read this predicate directly, so it cannot rely on a caller
    // adding the synthetic half back.
    ok:
      corpus.length >= floor &&
      uncoveredTools.length === 0 &&
      migratedUncovered.length === 0 &&
      covering.every((r) => r.status !== 'diverged'),
    replayable: corpus.length,
    floor,
    uncoveredTools,
    migratedUncovered,
  };
}

// ---------------------------------------------------------------------------
// the anti-vacuity prerequisite: what the current checks.sh asks for
// ---------------------------------------------------------------------------

/** The run's own roots, as the live phase saw them. The expected set is built
 *  against these and then canonicalized to `<ARM>`, so it compares against an
 *  arm's canonical records. */
export interface SourceRoots {
  runDir: string;
  workspaceRoot: string;
  agentHome: string;
  configDir: string;
}

// A first token the scan reads as a verb; `for`/`while`/… are shell keywords
// that happen to match the same shape, so they are named out.
const VERB_SHAPED = /^[a-z][a-z0-9-]*$/;
const BASH_KEYWORDS: ReadonlySet<string> = new Set([
  'for',
  'while',
  'if',
  'case',
  '{',
  '}',
  'fi',
  'done',
]);

// Unquoted operators the scan cannot reproduce: each of them makes the shell
// do something — a pipeline, a second command, a redirection, a subshell —
// that is not "hand these words to one check".
const SHELL_OPERATORS: ReadonlySet<string> = new Set([
  '|',
  ';',
  '&',
  '<',
  '>',
  '(',
  ')',
  '`',
]);

// The three variables a shipped check expands at the outer layer. Any other
// expansion outside single quotes leaves the line unparsed: the scan has no
// value for it and must not guess.
function rootVariable(name: string, roots: SourceRoots): string | undefined {
  if (name === 'QUORUM_AGENT_HOME') {
    return roots.agentHome;
  }
  if (name === 'QUORUM_RUN_DIR') {
    return roots.runDir;
  }
  if (name === 'QUORUM_AGENT_CONFIG_DIR') {
    return roots.configDir;
  }
  return undefined;
}

// A `$NAME` or `${NAME}` the scan can expand, or null for anything else —
// a command substitution, a positional or special parameter, a name the scan
// has no value for, a parameter expansion with a modifier.
function readExpansion(
  line: string,
  at: number,
  roots: SourceRoots,
): { text: string; next: number } | null {
  if (line[at + 1] === '(') {
    return null; // command or arithmetic substitution
  }
  let name: string;
  let next: number;
  if (line[at + 1] === '{') {
    const end = line.indexOf('}', at + 2);
    if (end === -1) {
      return null;
    }
    name = line.slice(at + 2, end);
    next = end + 1;
  } else {
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(at + 1));
    if (match === null) {
      return null;
    }
    name = match[0];
    next = at + 1 + name.length;
  }
  const value = rootVariable(name, roots);
  return value === undefined ? null : { text: value, next };
}

// Bash's double-quoted word: a backslash escapes only `$`, a backtick, `"` and
// itself; a backtick or `$(` is a substitution the scan refuses; the three
// root variables expand and every other `$` refuses.
function readDoubleQuoted(
  line: string,
  from: number,
  roots: SourceRoots,
): { text: string; next: number } | null {
  let text = '';
  let i = from;
  while (i < line.length) {
    const ch = line[i] ?? '';
    if (ch === '"') {
      return { text, next: i + 1 };
    }
    if (ch === '\\') {
      const nextCh = line[i + 1];
      if (nextCh === undefined) {
        return null;
      }
      if (
        nextCh === '$' ||
        nextCh === '`' ||
        nextCh === '"' ||
        nextCh === '\\'
      ) {
        text += nextCh;
        i += 2;
      } else {
        text += ch;
        i += 1;
      }
      continue;
    }
    if (ch === '`') {
      return null;
    }
    if (ch === '$') {
      const expansion = readExpansion(line, i, roots);
      if (expansion === null) {
        return null;
      }
      text += expansion.text;
      i = expansion.next;
      continue;
    }
    text += ch;
    i += 1;
  }
  return null; // unterminated
}

// One logical line as bash would word-split it, or null when the shell would
// do something the scan cannot reproduce. Single-quoted text is opaque: a
// `$(…)`, a backtick or a `|` inside it is just characters of the argument,
// exactly as bash hands it to the check.
function shellWords(line: string, roots: SourceRoots): string[] | null {
  const tokens: string[] = [];
  let current = '';
  let started = false;
  let i = 0;
  const endWord = (): void => {
    if (started) {
      tokens.push(current);
      current = '';
      started = false;
    }
  };
  while (i < line.length) {
    const ch = line[i] ?? '';
    if (ch === ' ' || ch === '\t') {
      endWord();
      i += 1;
      continue;
    }
    if (ch === '#' && !started) {
      break; // a comment runs to the end of the line
    }
    if (ch === "'") {
      const end = line.indexOf("'", i + 1);
      if (end === -1) {
        return null;
      }
      started = true;
      current += line.slice(i + 1, end);
      i = end + 1;
      continue;
    }
    if (ch === '"') {
      const quoted = readDoubleQuoted(line, i + 1, roots);
      if (quoted === null) {
        return null;
      }
      started = true;
      current += quoted.text;
      i = quoted.next;
      continue;
    }
    if (ch === '\\') {
      const nextCh = line[i + 1];
      if (nextCh === undefined) {
        return null;
      }
      started = true;
      current += nextCh;
      i += 2;
      continue;
    }
    if (ch === '$') {
      const expansion = readExpansion(line, i, roots);
      if (expansion === null) {
        return null;
      }
      started = true;
      current += expansion.text;
      i = expansion.next;
      continue;
    }
    if (SHELL_OPERATORS.has(ch)) {
      return null;
    }
    started = true;
    current += ch;
    i += 1;
  }
  endWord();
  return tokens;
}

// Whether a logical line ends inside a backslash escape — bash's line
// continuation — judged with the quote state, so a backslash inside single
// quotes does not fold the next line in.
function endsWithContinuation(line: string): boolean {
  let single = false;
  let double = false;
  let escaped = false;
  for (const ch of line) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (single) {
      if (ch === "'") {
        single = false;
      }
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (double) {
      if (ch === '"') {
        double = false;
      }
      continue;
    }
    if (ch === "'") {
      single = true;
    } else if (ch === '"') {
      double = true;
    }
  }
  return escaped;
}

// The lines of post(), from `post() {` to its closing `}` at column 0, with
// bash's line continuations folded: the backslash and the newline go, nothing
// is inserted, so `scenarios/codex-gate-backstop-finding-forces-choice/
// checks.sh:31-33` is one logical line and one record with five args, as the
// corpus recorded it.
function postLogicalLines(text: string): string[] {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^post\(\)\s*\{/.test(line));
  if (start === -1) {
    return [];
  }
  const out: string[] = [];
  let pending = '';
  for (const line of lines.slice(start + 1)) {
    if (pending === '' && /^\}/.test(line)) {
      break;
    }
    const joined = pending + line;
    if (endsWithContinuation(joined)) {
      pending = joined.slice(0, -1);
      continue;
    }
    out.push(joined);
    pending = '';
  }
  if (pending !== '') {
    out.push(pending);
  }
  return out;
}

// Replace each source root — as spelled and as resolved — with `<ARM>`, so the
// expected set and the recorded args read like an arm's canonical records.
function sourceNeedles(roots: SourceRoots): string[] {
  const all = new Set<string>();
  for (const root of [roots.runDir, roots.workspaceRoot]) {
    if (root === '') {
      continue;
    }
    all.add(root);
    if (existsSync(root)) {
      all.add(realpathSync(root));
    }
  }
  return [...all].sort((a, b) => b.length - a.length);
}

function canonicalizeAgainst(args: string[], needles: string[]): string[] {
  return args.map((arg) => {
    let out = arg;
    for (const needle of needles) {
      out = out.split(needle).join('<ARM>');
    }
    return out;
  });
}

// The check a line names, with `not` and `check-transcript` stripped, or null
// when the line is not a check the scan can read.
function readCheckLine(
  tokens: string[],
): { check: string; args: string[]; negated: boolean } | null {
  const first = tokens[0];
  if (
    first === undefined ||
    BASH_KEYWORDS.has(first) ||
    !VERB_SHAPED.test(first)
  ) {
    return null;
  }
  let index = 0;
  let negated = false;
  while (tokens[index] === 'not' || tokens[index] === 'check-transcript') {
    if (tokens[index] === 'not') {
      negated = true;
    }
    index += 1;
  }
  const check = tokens[index];
  if (
    check === undefined ||
    BASH_KEYWORDS.has(check) ||
    !VERB_SHAPED.test(check)
  ) {
    return null;
  }
  return { check, args: tokens.slice(index + 1), negated };
}

/** The post checks the current checks.sh asks for, keyed the way a record is,
 *  plus the lines the scan could not read. Built from the text alone — never
 *  from what an arm emitted — because that is what makes it a prerequisite
 *  rather than a restatement of the result. `expected` is the key set;
 *  `expectedCounts` says how many lines ask for each key, since a check the
 *  text runs twice is owed two records, not one. */
export function expectedPostChecks(
  checksShText: string,
  roots: SourceRoots,
): {
  expected: Set<string>;
  expectedCounts: Map<string, number>;
  unparsedLines: string[];
} {
  const needles = sourceNeedles(roots);
  const expectedCounts = new Map<string, number>();
  const unparsedLines: string[] = [];
  for (const line of postLogicalLines(checksShText)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    const tokens = shellWords(line, roots);
    const parsed = tokens === null ? null : readCheckLine(tokens);
    if (parsed === null) {
      unparsedLines.push(trimmed);
      continue;
    }
    const key = recordKey(
      parsed.check,
      canonicalizeAgainst(parsed.args, needles),
      parsed.negated,
    );
    expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + 1);
  }
  return {
    expected: new Set(expectedCounts.keys()),
    expectedCounts,
    unparsedLines,
  };
}

// Occurrences per key, for the multisets the prerequisite consumes.
function tally(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// An unparsed line is never silently non-load-bearing. Its leading verb is the
// obvious candidate, but a compound line — `if …; then file-exists x; fi`, a
// `for` loop — leads with a keyword and still runs whatever it mentions, so
// every verb named ANYWHERE in the line counts. If one of them matches a
// historical post pass the expected set did not account for, the scan cannot
// tell a check that vanished from one hidden inside a line it cannot read, and
// only the first of those is safe to merely list.
function mentionsCheck(line: string, checks: ReadonlySet<string>): boolean {
  for (const token of line.split(/[^A-Za-z0-9-]+/)) {
    if (checks.has(token)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// running one run, and one synthetic fixture, through both arms
// ---------------------------------------------------------------------------

interface PhasePair {
  pre: RunPhaseArgs;
  post: RunPhaseArgs;
}

type EnvMutation = (env: Record<string, string>) => Record<string, string>;

// The outer-environment arguments a phase implies, mapped exactly as runPhase
// maps them (src/checks/index.ts), so neither arm can differ from production
// by an argument the replay forgot.
function envArgsFor(args: RunPhaseArgs): OuterEnvArgs {
  return {
    repoRoot: args.repoRoot,
    agentHome: args.agentHome,
    ...(args.transcriptPath !== undefined
      ? { transcriptPath: args.transcriptPath }
      : {}),
    ...(args.runDir !== undefined ? { runDir: args.runDir } : {}),
    ...(args.configDir !== undefined ? { configDir: args.configDir } : {}),
    ...(args.codingAgent !== undefined
      ? { codingAgent: args.codingAgent }
      : {}),
  };
}

// The two production call sites (src/runner/index.ts: the pre and post
// runPhase calls) in one place: the post phase differs only by its name and by
// QUORUM_TRANSCRIPT_PATH, which exists only there.
function phasesFor(input: {
  checksSh: string;
  armRoot: string;
  repoRoot: string;
  configDir: string;
  codingAgent: string;
  transcriptPath?: string;
}): PhasePair {
  const pre: RunPhaseArgs = {
    checksSh: input.checksSh,
    phase: 'pre',
    workdir: join(input.armRoot, 'coding-agent-workdir'),
    repoRoot: input.repoRoot,
    // The arm stands in for the whole run: a check that addresses
    // $QUORUM_RUN_DIR must reach the clone, never the retained record.
    runDir: input.armRoot,
    configDir: input.configDir,
    codingAgent: input.codingAgent,
    agentHome: join(input.armRoot, 'home'),
  };
  return {
    pre,
    post: {
      ...pre,
      phase: 'post',
      ...(input.transcriptPath !== undefined
        ? { transcriptPath: input.transcriptPath }
        : {}),
    },
  };
}

async function runArm(
  mode: 'legacy' | 'projected',
  armRoot: string,
  phases: PhasePair,
  mutate?: EnvMutation,
): Promise<ArmResult> {
  const raw: ArmRecord[] = [];
  const exitCodes = { pre: 0, post: 0 };
  for (const phase of ['pre', 'post'] as const) {
    const args = phases[phase];
    const built =
      mode === 'legacy'
        ? legacyOuterEnv(envArgsFor(args))
        : outerEnv(envSnapshot(), envArgsFor(args));
    const result = await runPhaseWithEnv(
      args,
      mutate === undefined ? built : mutate(built),
    );
    exitCodes[phase] = result.exitCode;
    for (const record of result.records) {
      raw.push({
        phase,
        check: record.check,
        args: [...record.args],
        negated: record.negated,
        passed: record.passed,
      });
    }
  }
  const { records, rewrites } = canonicalize(raw, armRoot);
  return {
    raw,
    canonical: records,
    exitCodes,
    rewrites,
    home: phases.post.agentHome,
    root: armRoot,
  };
}

// Every command position of an inner command, and the word that leads it: the
// start of the string, and whatever follows `&&`, `||`, `;`, `|`, a subshell,
// a backtick or `$(`. A leading `!` and any `VAR=value` prefixes are stepped
// over as the shell steps over them, so `expected=$(node -e …) && grep …`
// reports `node` and `grep`. Single-quoted text is opaque, as it is to bash.
function commandLeaders(command: string): string[] {
  const out: string[] = [];
  let word = '';
  let atStart = true;
  let single = false;
  let double = false;
  let escaped = false;
  const endWord = (): void => {
    if (word === '') {
      return;
    }
    const bare = word.replace(/^!+/, '');
    if (atStart && bare !== '' && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(bare)) {
      out.push(bare);
      atStart = false;
    }
    word = '';
  };
  const newCommand = (): void => {
    endWord();
    atStart = true;
  };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i] ?? '';
    if (escaped) {
      word += ch;
      escaped = false;
      continue;
    }
    if (single) {
      if (ch === "'") {
        single = false;
      } else {
        word += ch;
      }
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    // A substitution is its own command list, however it is quoted.
    if (ch === '$' && command[i + 1] === '(') {
      const end = matchingParen(command, i + 1);
      out.push(...commandLeaders(command.slice(i + 2, end)));
      i = end;
      continue;
    }
    if (ch === '`') {
      const end = command.indexOf('`', i + 1);
      const stop = end === -1 ? command.length : end;
      out.push(...commandLeaders(command.slice(i + 1, stop)));
      i = stop;
      continue;
    }
    if (double) {
      if (ch === '"') {
        double = false;
      } else {
        word += ch;
      }
      continue;
    }
    if (ch === "'") {
      single = true;
      continue;
    }
    if (ch === '"') {
      double = true;
      continue;
    }
    if (SHELL_OPERATORS.has(ch) || ch === '{' || ch === '}' || ch === '\n') {
      newCommand();
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      endWord();
      continue;
    }
    word += ch;
  }
  endWord();
  return out;
}

// The index of the `)` closing the `(` at `open`, counting nesting; the end of
// the string when it is unbalanced.
function matchingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') {
      depth += 1;
    } else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return text.length;
}

function innerTools(records: readonly ArmRecord[]): string[] {
  const out = new Set<string>();
  for (const record of records) {
    if (record.phase !== 'post' || record.check !== 'command-succeeds') {
      continue;
    }
    for (const command of record.args) {
      for (const tool of commandLeaders(command)) {
        out.add(tool);
      }
    }
  }
  return [...out].sort();
}

// An entry of the source whose tree must be byte-identical before and after.
interface SourceHash {
  path: string;
  hash: string;
}

function hashSources(paths: string[]): SourceHash[] {
  return paths.map((path) => ({ path, hash: hashTree(path) }));
}

function requireSourceUnchanged(before: SourceHash[], when: string): void {
  for (const entry of before) {
    if (hashTree(entry.path) !== entry.hash) {
      throw new Error(`${entry.path} changed ${when}`);
    }
  }
}

// A symlink to a directory outside the run is a replay hazard, not a note: a
// command the checks address through it would run outside the arm, where the
// replay's guarantees end. Task 9 reports every external reference without
// judging it; this is the layer that decides, and it refuses the run rather
// than running arms whose reach it cannot describe.
function requireNoExternalDirectories(
  report: PointerReport,
  armRoot: string,
): void {
  for (const reference of report.externalReferences) {
    const resolved = resolveThrough(reference);
    if (isDirectory(resolved)) {
      throw new Error(
        `${relative(armRoot, reference)} leads to a directory outside the run: ${resolved}`,
      );
    }
  }
  // An external alternate is listed above as the regular alternates FILE, so
  // the loop sees no directory and would let both arms read an untracked
  // shared object store. The directory that decides is the one named inside.
  for (const store of report.externalAlternates ?? []) {
    if (isDirectory(store)) {
      throw new Error(`an alternate object store outside the run: ${store}`);
    }
  }
}

// How the audit treats a path that lands outside the arm: `refuse` for one git
// would read configuration from or write a working tree through, which the
// clone guarantees is inside the arm; `unless-directory` for the two kinds the
// clone reports rather than refuses — an object store and a plain symlink —
// where only an existing directory gives a later command somewhere to go.
type PathJudge = (
  what: string,
  target: string,
  outside: 'refuse' | 'unless-directory',
) => void;

// `objects/info/alternates` of one gitdir, read the way git reads it: one
// store per line, relative to `objects/`, `#` lines ignored.
function auditAlternates(
  gitdir: string,
  armReal: string,
  judge: PathJudge,
): void {
  const objects = join(gitdir, 'objects');
  const file = vetConfigFile(join(objects, 'info', 'alternates'), armReal);
  if (file === null) {
    return;
  }
  for (const [index, line] of readFileSync(file, 'utf8')
    .split('\n')
    .entries()) {
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    if (line.startsWith('"')) {
      throw new Error(`${file}:${index + 1}: a quoted alternate`);
    }
    judge(`${file} (alternate)`, resolve(objects, line), 'unless-directory');
  }
}

// One gitdir's `config` and `config.worktree`, and whatever they include: the
// same two keys the clone places, read with the same reader, which refuses a
// line it cannot classify.
function auditConfig(gitdir: string, armReal: string, judge: PathJudge): void {
  const seen = new Set<string>();
  const queue = [join(gitdir, 'config'), join(gitdir, 'config.worktree')];
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    const file = vetConfigFile(next, armReal);
    if (file === null || seen.has(file)) {
      continue;
    }
    seen.add(file);
    for (const entry of parseConfig(
      file,
      readFileSync(file, 'utf8').split('\n'),
    )) {
      if (
        entry.key === 'worktree' &&
        entry.section === 'core' &&
        entry.subsection === null
      ) {
        judge(
          `${file} (core.worktree)`,
          resolve(gitdir, entry.value ?? ''),
          'refuse',
        );
        continue;
      }
      const include =
        entry.key === 'path' &&
        ((entry.section === 'include' && entry.subsection === null) ||
          (entry.section === 'includeif' && entry.subsection !== null));
      if (!include) {
        continue;
      }
      const value = entry.value ?? '';
      const target = value.startsWith('~')
        ? join(armReal, 'home', value.slice(1))
        : resolve(dirname(file), value);
      judge(`${file} (include path)`, target, 'refuse');
      queue.push(target);
    }
  }
}

// Prove the arm is still what the clone made it, after the phases have run.
// The clone classifies seven pointer kinds; reading only symlinks and the two
// pointer file names left five of them unexamined, and a post check runs
// agent-authored code that can write any of them into the arm — a
// `commondir`, a `core.worktree`, an include, an alternate — which the next
// git command in the arm would read. The source hashes do not move when that
// happens, and both arms can still emit identical records, so without this the
// run returns `equal`.
//
// Every finding here is an instrument failure rather than a per-run refusal:
// the clone proved the arm clean and the external-directory check cleared it
// before a single phase ran, so whatever this finds was written during the
// replay by code the replay executed. That is the instrument losing control of
// its own arm, which is how the brief already treats the worst of it.
function auditArm(armRoot: string, forbidden: string[]): void {
  const real = realpathSync(armRoot);
  const judge: PathJudge = (what, target, outside) => {
    const resolved = resolveThrough(target);
    if (contains(real, resolved)) {
      return;
    }
    for (const root of forbidden) {
      if (contains(root, resolved)) {
        throw new Error(`${what} resolves into ${root}: ${target}`);
      }
    }
    if (outside === 'refuse') {
      throw new Error(`${what} resolves outside the arm: ${target}`);
    }
    if (isDirectory(resolved)) {
      throw new Error(
        `${what} leads to a directory outside the run: ${resolved}`,
      );
    }
  };
  for (const link of walkSymlinks(real)) {
    const target = readlinkSync(link);
    judge(
      link,
      isAbsolute(target) ? target : resolve(dirname(link), target),
      'unless-directory',
    );
  }
  // Refuses a `.git` or `gitdir` that is a symlink, as the clone does.
  for (const file of pointerFiles(real)) {
    const value = readFileSync(file, 'utf8')
      .trim()
      .replace(/^gitdir: /, '');
    judge(
      file,
      isAbsolute(value) ? value : resolve(dirname(file), value),
      'refuse',
    );
  }
  // Both routes to a gitdir, as the clone finds them.
  const gitdirs = new Set<string>();
  for (const dir of findGitDirs(real)) {
    gitdirs.add(realpathSync(dir));
  }
  for (const dir of gitfileTargets(real, real)) {
    gitdirs.add(dir);
  }
  for (const gitdir of gitdirs) {
    const common = readCommonDir(gitdir);
    if (common !== null) {
      judge(`${common.file} (commondir)`, common.resolved, 'refuse');
    }
    auditAlternates(gitdir, real, judge);
    auditConfig(gitdir, real, judge);
  }
}

// A run the instrument declines to replay: a clone it could not vet, or a
// workspace that reaches a directory outside the run. This is a per-run
// outcome — the sweep names it and goes on — and it is deliberately a
// different thing from a failure of the instrument itself (a source tree that
// changed under the replay, an arm that reached into the other), which is
// never a result and is not caught here.
class ReplayRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReplayRefusal';
  }
}

// A Node system error: the host failed. `cpSync`'s own refusals — a FIFO or a
// socket it cannot copy (ERR_FS_CP_*) — are not these; they say this recorded
// workspace is unclonable, which is a property of the run.
const ERRNO = /^E[A-Z]+$/;

function errnoCode(err: unknown): string | undefined {
  if (!(err instanceof Error)) {
    return undefined;
  }
  const code = (err as NodeJS.ErrnoException).code;
  return typeof code === 'string' ? code : undefined;
}

// Run one vetting step, turning what it refuses into a per-run refusal — but
// only what it refuses. An ENOSPC, EIO or EACCES out of the copy is the host
// failing underneath the sweep, and filing it as "this run could not be
// vetted" would let a disk that filled up read as a sweep that merely covered
// less. Those propagate, and the sweep stops on them.
function refusable<T>(step: () => T): T {
  try {
    return step();
  } catch (err) {
    const code = errnoCode(err);
    if (code !== undefined && ERRNO.test(code)) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new ReplayRefusal(
      code === undefined ? message : `${code}: ${message}`,
    );
  }
}

// An external reference as the retained artifact names it: where it sits in
// the arm and what it leads to, since whether the reference is benign is a
// judgement about its target.
function describeReference(path: string, armRoot: string): string {
  const where = relative(armRoot, path);
  const stat = lstatSync(path, { throwIfNoEntry: false });
  return stat?.isSymbolicLink() === true
    ? `${where} -> ${readlinkSync(path)}`
    : where;
}

// A post phase that left nothing to compare: it exited in the crash band, or
// it emitted no record at all. Read on the CONTROL arm alone, and only where
// the two arms already agree — Arm L is the control, and a control that
// cannot reproduce the record means there was nothing to compare, while a
// control that can and a treatment that cannot is a difference the two
// environments made. The arms are identical but for that environment, so an
// asymmetric crash is the regression this instrument exists to find and must
// stay `diverged`: `degraded-archive` would take it out of coverage()'s
// counting sets altogether and let the sweep exit 0 on it.
function vacuousPostPhase(control: ArmResult): boolean {
  return (
    control.exitCodes.post !== 0 || !control.raw.some((r) => r.phase === 'post')
  );
}

function vacuityNote(control: ArmResult): string {
  return `the post phase emitted no usable record (exit ${control.exitCodes.post})`;
}

function resolveRoots(opts: ReplayOptions): {
  scenariosRoot: string;
  agentsDir: string;
  checksFile: string;
} {
  return {
    scenariosRoot: opts.scenariosRoot ?? join(opts.repoRoot, 'scenarios'),
    agentsDir: opts.agentsDir ?? join(opts.repoRoot, 'coding-agents'),
    checksFile: opts.checksFile ?? 'checks.sh',
  };
}

/** Replay one recorded run through both arms. The retained record and
 *  workspace are hashed before the first clone and re-checked after every step
 *  that could have written to them; a replay that touched retained evidence
 *  throws rather than returning a result. */
export async function replayRun(
  run: EligibleRun,
  opts: ReplayOptions,
): Promise<ReplayResult> {
  const { scenariosRoot, agentsDir, checksFile } = resolveRoots(opts);
  const checksSh = join(scenariosRoot, run.scenario, checksFile);
  if (!existsSync(checksSh)) {
    // Nothing to ask of this run, which is a refusal rather than a failure:
    // the sweep names it and goes on.
    throw new ReplayRefusal(`${checksSh} does not exist`);
  }
  const parsed = parseRunDirName(basename(run.runDir), knownAgents(agentsDir));
  const agent = parsed?.agent ?? opts.codingAgent;
  if (agent === undefined) {
    throw new Error(`${run.runId}: no coding agent in the run dir name`);
  }
  const cfg = offlineAgentConfig(agentsDir, agent);

  const sources = [...new Set([run.runDir, run.workspaceRoot])];
  const before = hashSources(sources);

  const armLRoot = opts.scratch();
  const reportL = refusable(() => cloneWorkspace(run, armLRoot));
  requireSourceUnchanged(before, 'while Arm L was cloned');
  refusable(() => requireNoExternalDirectories(reportL, armLRoot));
  const armNRoot = opts.scratch();
  refusable(() => cloneWorkspace(run, armNRoot));
  requireSourceUnchanged(before, 'while Arm N was cloned');

  const trajectory = join(run.runDir, 'trajectory.json');
  const transcript = existsSync(trajectory)
    ? { transcriptPath: trajectory }
    : {};
  const common = { checksSh, repoRoot: opts.repoRoot, codingAgent: agent };
  const armL = await runArm(
    'legacy',
    armLRoot,
    phasesFor({
      ...common,
      ...transcript,
      armRoot: armLRoot,
      configDir: agentConfigDir(cfg, join(armLRoot, 'home')),
    }),
  );
  const armN = await runArm(
    'projected',
    armNRoot,
    phasesFor({
      ...common,
      ...transcript,
      armRoot: armNRoot,
      configDir: agentConfigDir(cfg, join(armNRoot, 'home')),
    }),
  );
  requireSourceUnchanged(before, 'while the arms ran');
  const sourceReal = sources.map((path) => realpathSync(path));
  auditArm(armLRoot, [...sourceReal, realpathSync(armNRoot)]);
  auditArm(armNRoot, [...sourceReal, realpathSync(armLRoot)]);

  // The prerequisite. The expected set comes from the current checks.sh text
  // alone; the history comes from the record; neither is read off an arm.
  const sourceHome = join(run.workspaceRoot, 'home');
  const roots: SourceRoots = {
    runDir: run.runDir,
    workspaceRoot: run.workspaceRoot,
    agentHome: sourceHome,
    configDir: agentConfigDir(cfg, sourceHome),
  };
  const { expectedCounts, unparsedLines } = expectedPostChecks(
    readFileSync(checksSh, 'utf8'),
    roots,
  );
  const needles = sourceNeedles(roots);
  const history = readVerdict(join(run.runDir, 'verdict.json'))?.checks ?? [];
  const historical = (
    phase: 'pre' | 'post',
  ): { key: string; described: string; check: string }[] =>
    history
      .filter((c: CheckRecord) => c.phase === phase && c.passed)
      .map((c: CheckRecord) => {
        const args = canonicalizeAgainst([...c.args], needles);
        return {
          key: recordKey(c.check, args, c.negated),
          described: describeCheck(c.check, args, c.negated),
          check: c.check,
        };
      });

  const armKey = (r: ArmRecord): string =>
    recordKey(r.check, r.args, r.negated);
  // Multisets on every side. A post phase that runs the same check twice
  // records two passes; a replay that short-circuits after the first emits
  // one, and matched by membership that one record would answer for both.
  // Each historical occurrence therefore consumes one line of the current
  // text and one distinct passing control-arm record: an occurrence the text
  // no longer asks for is unmatched history (a removed line, like a changed
  // one), and an occurrence the control arm cannot supply a record for is a
  // miss — whether the record is absent or present and failed.
  const unconsumedLines = new Map(expectedCounts);
  const unconsumedPasses = tally(
    armL.canonical
      .filter((r) => r.phase === 'post' && r.passed)
      .map((r) => armKey(r)),
  );
  const unmatchedHistory: string[] = [];
  const unmatchedChecks = new Set<string>();
  let degradedCheck: string | undefined;
  for (const entry of historical('post')) {
    const asked = unconsumedLines.get(entry.key) ?? 0;
    if (asked === 0) {
      unmatchedHistory.push(entry.described);
      unmatchedChecks.add(entry.check);
      continue;
    }
    unconsumedLines.set(entry.key, asked - 1);
    const supplied = unconsumedPasses.get(entry.key) ?? 0;
    if (supplied === 0) {
      if (degradedCheck === undefined) {
        degradedCheck = entry.described;
      }
      continue;
    }
    unconsumedPasses.set(entry.key, supplied - 1);
  }
  if (degradedCheck === undefined) {
    for (const line of unparsedLines) {
      if (mentionsCheck(line, unmatchedChecks)) {
        degradedCheck = `unparsed: ${line}`;
        break;
      }
    }
  }

  const armPre = armL.canonical.filter((r) => r.phase === 'pre');
  const preDivergencesFromHistory = historical('pre')
    .filter(
      (entry) => armPre.find((r) => armKey(r) === entry.key)?.passed === false,
    )
    .map((entry) => entry.described);

  const comparison = compareArms(armL, armN);
  // The prerequisite above speaks only for recorded post PASSES, and a run
  // whose post checks all failed is still eligible (classify asks only that
  // the verdict hold some post record). For such a run the loops above cannot
  // fire, so a post phase that crashes before emitting anything leaves two
  // empty record sets and two equal exit codes, which equality alone would
  // call a pass. Only where the arms agree, though: see vacuousPostPhase.
  if (
    degradedCheck === undefined &&
    comparison.equal &&
    vacuousPostPhase(armL)
  ) {
    degradedCheck = vacuityNote(armL);
  }
  const status: ReplayResult['status'] =
    degradedCheck !== undefined
      ? 'degraded-archive'
      : comparison.equal
        ? 'equal'
        : 'diverged';
  return {
    scenario: run.scenario,
    runId: run.runId,
    status,
    ...(comparison.firstDivergence !== undefined
      ? { firstDivergence: comparison.firstDivergence }
      : {}),
    ...(degradedCheck !== undefined ? { degradedCheck } : {}),
    preDivergencesFromHistory,
    unmatchedHistory,
    unparsedLines,
    tools: innerTools(armL.raw),
    armL,
    armN,
    externalReferences: reportL.externalReferences
      .map((path) => describeReference(path, armLRoot))
      .sort(),
  };
}

// Seed one fixture arm: `workspace/` into the arm's coding-agent-workdir and
// `workspace-home/` into its home, with each `*.tmpl` written out under its
// stem with this arm's home substituted. The home path is per arm, so a
// fixture that has to name it cannot ship the text.
function seedFixtureArm(fixtureDir: string, armRoot: string): string {
  const workdir = join(armRoot, 'coding-agent-workdir');
  const home = join(armRoot, 'home');
  mkdirSync(workdir, { recursive: true });
  mkdirSync(home, { recursive: true });
  // The runner pre-creates these for every live run; an inner command under
  // the projected environment is pointed at them.
  for (const dir of xdgHomeSubdirs(home)) {
    mkdirSync(dir, { recursive: true });
  }
  for (const [from, to] of [
    ['workspace', workdir],
    ['workspace-home', home],
  ] as const) {
    const source = join(fixtureDir, from);
    if (!existsSync(source)) {
      continue;
    }
    cpSync(source, to, { recursive: true });
  }
  const templates: string[] = [];
  walk(armRoot, (path, entry) => {
    if (entry.isFile() && path.endsWith('.tmpl')) {
      templates.push(path);
    }
  });
  for (const template of templates) {
    const text = readFileSync(template, 'utf8')
      .split('__AGENT_HOME__')
      .join(home);
    writeFileSync(template.slice(0, -'.tmpl'.length), text);
    rmSync(template);
  }
  return armRoot;
}

/** Replay a synthetic fixture through both arms. There is no recorded verdict,
 *  so there is no prerequisite to apply and nothing to list as unmatched: a
 *  fixture is a counterfactual written in the current check format, and arm
 *  equality is the whole of what it claims. */
export async function replayFixture(
  fixtureDir: string,
  opts: ReplayOptions & { armLMutate?: EnvMutation },
): Promise<ReplayResult> {
  const { agentsDir, checksFile } = resolveRoots(opts);
  const agent = opts.codingAgent;
  if (agent === undefined) {
    throw new Error(`${fixtureDir}: a synthetic fixture needs a coding agent`);
  }
  const cfg = offlineAgentConfig(agentsDir, agent);
  const checksSh = join(fixtureDir, checksFile);
  if (!existsSync(checksSh)) {
    // Without this the phase would fail to source anything, both arms would
    // crash identically, and the fixture would report `equal` while proving
    // nothing — which is precisely the vacuous pass this instrument refuses.
    throw new Error(`${checksSh} does not exist`);
  }
  // A fixture stands in for a scenario the corpus cannot cover, so it names
  // that scenario; without the file it stands only for itself.
  const named = join(fixtureDir, 'scenario');
  const scenario = existsSync(named)
    ? readFileSync(named, 'utf8').trim()
    : basename(fixtureDir);
  const common = { checksSh, repoRoot: opts.repoRoot, codingAgent: agent };
  const armLRoot = seedFixtureArm(fixtureDir, opts.scratch());
  const armNRoot = seedFixtureArm(fixtureDir, opts.scratch());
  const armL = await runArm(
    'legacy',
    armLRoot,
    phasesFor({
      ...common,
      armRoot: armLRoot,
      configDir: agentConfigDir(cfg, join(armLRoot, 'home')),
    }),
    opts.armLMutate,
  );
  const armN = await runArm(
    'projected',
    armNRoot,
    phasesFor({
      ...common,
      armRoot: armNRoot,
      configDir: agentConfigDir(cfg, join(armNRoot, 'home')),
    }),
  );
  const comparison = compareArms(armL, armN);
  // A fixture is evidence only if it ran. A post phase that crashed, or that
  // emitted no record at all, fails the same way in both arms; counting that
  // as `equal` would let a broken fixture clear a tool or a migrated scenario
  // off the coverage list. `degraded-archive` is how coverage() says "this
  // result does not count" — and, by the same token, not what an asymmetric
  // crash gets, which is why this reads the control arm under agreement.
  const vacuous = comparison.equal && vacuousPostPhase(armL);
  // A fixture is written to pass. A failed assertion is still a clean phase
  // (runPhaseWithEnv normalizes rc 1 with records), so two arms failing the
  // same check compare equal — and the fixture's tool and its migrated
  // scenario would come off the coverage list having demonstrated nothing.
  const failed =
    comparison.equal && !vacuous
      ? armL.raw.find((r) => r.phase === 'post' && !r.passed)
      : undefined;
  const degradedCheck = vacuous
    ? vacuityNote(armL)
    : failed === undefined
      ? undefined
      : describeCheck(failed.check, failed.args, failed.negated);
  return {
    scenario,
    runId: null,
    status:
      degradedCheck !== undefined
        ? 'degraded-archive'
        : comparison.equal
          ? 'equal'
          : 'diverged',
    ...(comparison.firstDivergence !== undefined
      ? { firstDivergence: comparison.firstDivergence }
      : {}),
    ...(degradedCheck !== undefined ? { degradedCheck } : {}),
    preDivergencesFromHistory: [],
    unmatchedHistory: [],
    unparsedLines: [],
    tools: innerTools(armL.raw),
    armL,
    armN,
    externalReferences: [],
  };
}

// ---------------------------------------------------------------------------
// the sweep
// ---------------------------------------------------------------------------

interface ReplayArgs {
  results: string;
  scenarios: string;
  agentsDir: string;
  report?: string;
  synthetic: string[];
  only: string[];
}

// A run whose clone the instrument would not vet. It is a per-run outcome, not
// a sweep abort: the run is named with its reason and the sweep goes on, and
// it simply never joins the replayable set the floor is measured against.
interface CloneRefusal {
  scenario: string;
  runId: string;
  message: string;
}

interface ReplayReport {
  resultsRoot: string;
  scenariosRoot: string;
  eligibleCount: number;
  selectedCount: number;
  coverage: ReturnType<typeof coverage>;
  results: ReplayResult[];
  ineligible: Ineligible[];
  refused: CloneRefusal[];
  layouts: Record<string, string>;
}

function parseArgs(
  argv: readonly string[],
): { args: ReplayArgs } | { error: string } {
  const args: ReplayArgs = {
    results: 'results',
    scenarios: 'scenarios',
    agentsDir: 'coding-agents',
    synthetic: [],
    only: [],
  };
  let i = 0;
  while (i < argv.length) {
    const flag = argv[i] ?? '';
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      return { error: `replay: ${flag} needs a value` };
    }
    if (flag === '--results') {
      args.results = value;
    } else if (flag === '--scenarios') {
      args.scenarios = value;
    } else if (flag === '--agents-dir') {
      args.agentsDir = value;
    } else if (flag === '--report') {
      args.report = value;
    } else if (flag === '--synthetic') {
      args.synthetic.push(value);
    } else if (flag === '--only') {
      args.only.push(value);
    } else {
      return { error: `replay: unknown argument ${flag}` };
    }
    i += 2;
  }
  return { args };
}

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function list(values: readonly string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

function renderReport(report: ReplayReport): string {
  const cov = report.coverage;
  const lines = [
    '# Corpus replay',
    '',
    `- results root: \`${report.resultsRoot}\``,
    `- scenarios root: \`${report.scenariosRoot}\``,
    `- eligible: ${report.eligibleCount} (replayed: ${report.selectedCount}, ineligible: ${report.ineligible.length})`,
    `- replayable ${cov.replayable} of eligible ${report.selectedCount}, floor ${cov.floor}`,
    `- uncovered tools: ${list(cov.uncoveredTools)}`,
    `- migrated scenarios not covered: ${list(cov.migratedUncovered)}`,
    `- clone-refused: ${report.refused.length}`,
    `- coverage ok: ${cov.ok}`,
    '',
    '| scenario | run id | layout | pre | post | status | divergence / degraded | external refs | pre divergences | unmatched history | unparsed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of report.results) {
    const pre = r.armL.raw.filter((x) => x.phase === 'pre').length;
    const post = r.armL.raw.filter((x) => x.phase === 'post').length;
    lines.push(
      `| ${cell(r.scenario)} | ${cell(r.runId ?? 'synthetic')} | ${cell(r.runId === null ? 'fixture' : (report.layouts[r.runId] ?? '?'))} | ${pre} | ${post} | ${r.status} | ${cell(r.firstDivergence ?? r.degradedCheck ?? '')} | ${cell(list(r.externalReferences))} | ${cell(list(r.preDivergencesFromHistory))} | ${cell(list(r.unmatchedHistory))} | ${cell(list(r.unparsedLines))} |`,
    );
  }
  if (report.refused.length > 0) {
    lines.push('', '## Clone refused', '');
    for (const refusal of report.refused) {
      lines.push(`- ${refusal.runId}: ${refusal.message}`);
    }
  }
  if (report.ineligible.length > 0) {
    lines.push('', '## Ineligible', '');
    for (const entry of report.ineligible) {
      lines.push(
        `- ${entry.scenario}: ${entry.reason}${entry.runId === undefined ? '' : ` (${entry.runId})`}`,
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

function summary(report: ReplayReport): string {
  const cov = report.coverage;
  const count = (status: ReplayResult['status']): number =>
    report.results.filter((r) => r.status === status).length;
  return [
    `replayable ${cov.replayable} of eligible ${report.selectedCount}, floor ${cov.floor}`,
    `equal: ${count('equal')}  diverged: ${count('diverged')}  degraded-archive: ${count('degraded-archive')}  clone-refused: ${report.refused.length}`,
    `uncovered tools: ${list(cov.uncoveredTools)}`,
    `migrated scenarios not covered: ${list(cov.migratedUncovered)}`,
    // A refusal is a run the sweep could not replay; naming it here keeps it
    // out of the silence the floor alone would leave it in.
    ...report.refused.map((r) => `clone-refused ${r.runId}: ${r.message}`),
    ...report.results
      .filter((r) => r.status !== 'equal')
      .map(
        (r) =>
          `${r.status} ${r.runId ?? r.scenario}: ${r.firstDivergence ?? r.degradedCheck ?? ''} (arms ${r.armL.root}, ${r.armN.root})`,
      ),
    '',
  ].join('\n');
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// An arm whose result is `equal` has nothing left to say; one that diverged or
// degraded is what a triage reads, so it stays and the report names it.
function releaseArms(result: ReplayResult): void {
  if (result.status !== 'equal') {
    return;
  }
  for (const root of [result.armL.root, result.armN.root]) {
    rmSync(root, { recursive: true, force: true });
  }
}

async function main(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if ('error' in parsed) {
    process.stderr.write(`${parsed.error}\n`);
    return 2;
  }
  const repoRoot = resolve(import.meta.dir, '..', '..');
  const resultsRoot = resolve(parsed.args.results);
  const scenariosRoot = resolve(parsed.args.scenarios);
  const agentsDir = resolve(parsed.args.agentsDir);
  const { eligible, ineligible } = eligibleRuns(
    resultsRoot,
    scenariosRoot,
    knownAgents(agentsDir),
  );
  const selected =
    parsed.args.only.length === 0
      ? eligible
      : eligible.filter((run) => parsed.args.only.includes(run.scenario));
  const layouts: Record<string, string> = {};
  for (const run of selected) {
    layouts[run.runId] = run.layout;
  }

  const results: ReplayResult[] = [];
  const refused: CloneRefusal[] = [];
  const opts: ReplayOptions = {
    repoRoot,
    scenariosRoot,
    agentsDir,
    scratch: () => mkdtempSync(join(tmpdir(), 'replay-arm-')),
  };
  let instrumentFailure: string | undefined;
  if (eligible.length > 0) {
    for (const run of selected) {
      try {
        const result = await replayRun(run, opts);
        results.push(result);
        releaseArms(result);
      } catch (err) {
        if (!(err instanceof ReplayRefusal)) {
          // The replay touched retained evidence, or an arm reached into the
          // other. Nothing after this is trustworthy, so the sweep stops with
          // the report it has.
          instrumentFailure = `${run.runId}: ${errorMessage(err)}`;
          break;
        }
        refused.push({
          scenario: run.scenario,
          runId: run.runId,
          message: err.message,
        });
      }
    }
    for (const dir of parsed.args.synthetic) {
      if (instrumentFailure !== undefined) {
        break;
      }
      try {
        // A fixture exercises the two environments, not an agent: the only
        // thing its config contributes is home_config_subdir, and the plan's
        // agent of record supplies it.
        const result = await replayFixture(resolve(dir), {
          ...opts,
          codingAgent: 'claude-auto',
        });
        results.push(result);
        releaseArms(result);
      } catch (err) {
        instrumentFailure = `${dir}: ${errorMessage(err)}`;
      }
    }
  }

  const report: ReplayReport = {
    resultsRoot,
    scenariosRoot,
    eligibleCount: eligible.length,
    selectedCount: selected.length,
    coverage: coverage(results, selected.length),
    results,
    ineligible,
    refused,
    layouts,
  };
  if (parsed.args.report !== undefined) {
    const dir = resolve(parsed.args.report);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'replay.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    writeFileSync(join(dir, 'replay.md'), renderReport(report));
  }
  process.stdout.write(summary(report));
  if (instrumentFailure !== undefined) {
    process.stderr.write(
      `replay: instrument failure on ${instrumentFailure}\n`,
    );
    return 1;
  }

  // An empty or wrong results root is an instrument error, not a result: there
  // is nothing to have passed.
  if (eligible.length === 0) {
    process.stderr.write(
      `replay: no eligible run under ${resultsRoot}; nothing was replayed\n`,
    );
    return 2;
  }
  // coverage().ok already requires every counting result — synthetic ones
  // included — to be equal.
  return report.coverage.ok ? 0 : 1;
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
