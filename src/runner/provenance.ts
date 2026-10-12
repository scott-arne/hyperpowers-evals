import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import type { CommandRunner } from '../agents/command-runner.ts';
import type { Provenance } from '../contracts/verdict.ts';
import { getEnv } from '../env.ts';

// Every lookup is injected so the module is testable without a real PATH,
// filesystem, git or environment: the runner for git, the path entries for the
// gauntlet lookup, three filesystem predicates, and the environment read that
// finds a container image's build source.
export interface ProvenanceDeps {
  readonly runner: CommandRunner;
  readonly evalsRoot: string;
  readonly pathEntries: readonly string[];
  readonly readFile: (p: string) => string | null;
  readonly exists: (p: string) => boolean;
  readonly isDirectory: (p: string) => boolean;
  readonly isExecutable: (p: string) => boolean;
  readonly env: (name: string) => string | undefined;
}

function gitOut(
  runner: CommandRunner,
  cwd: string,
  args: readonly string[],
): string | null {
  const r = runner.run('git', ['-C', cwd, ...args]);
  return r.status === 0 ? r.stdout : null;
}

function commitOf(runner: CommandRunner, cwd: string): string | null {
  const out = gitOut(runner, cwd, ['rev-parse', 'HEAD']);
  if (out === null) return null;
  const c = out.trim();
  return /^[0-9a-f]{40}$/.test(c) ? c : null;
}

// The evals paths a run depends on, the same set docs/scenario-authoring.md §5
// compares between a row and a failing run: the harness code, the Bun
// configuration it runs under (bunfig.toml, tsconfig.json), the container
// launcher (container/, scripts/evals-container), the scenarios, and the
// fixtures that setup copies into a run's repository. The rest of the tree
// cannot change a run, and `evidence/` alone holds over 200,000 files that a
// whole-tree status would walk on every run.
export const HARNESS_PATHS: readonly string[] = [
  'src',
  'coding-agents',
  'package.json',
  'bun.lock',
  'bunfig.toml',
  'tsconfig.json',
  'container',
  'scripts/evals-container',
  'scenarios',
  'fixtures',
];

// Clean means `git status --porcelain --untracked-files=all` prints nothing:
// untracked files count, ignored files do not, and the explicit flag keeps a
// status.showUntrackedFiles=no setting from hiding them. `paths` limits the
// check, and the walk, to those pathspecs; empty means the whole checkout.
function cleanOf(
  runner: CommandRunner,
  cwd: string,
  paths: readonly string[] = [],
): boolean | null {
  const out = gitOut(runner, cwd, [
    'status',
    '--porcelain',
    '--untracked-files=all',
    ...(paths.length > 0 ? ['--', ...paths] : []),
  ]);
  return out === null ? null : out.trim() === '';
}

function toplevelOf(runner: CommandRunner, cwd: string): string | null {
  const out = gitOut(runner, cwd, ['rev-parse', '--show-toplevel']);
  return out === null ? null : out.trim() || null;
}

export function resolveOnPath(
  name: string,
  deps: ProvenanceDeps,
): string | null {
  for (const dir of deps.pathEntries) {
    if (dir === '') continue;
    const candidate = join(dir, name);
    if (deps.isExecutable(candidate)) return candidate;
  }
  return null;
}

// A shim's target, from the lines after the shebang (comment lines skipped). A
// cd-like word is cd or pushd once quotes, backslashes and a leading ( { $ or
// backtick are removed, as in c"d" or (cd. A script with none keeps the older
// rule: the first line holding an absolute path token that exists decides, and
// its last such token is the target. null, probed through the file's own
// directory, is a script with no such token or a file without a shebang (a
// binary). A script with any cd-like word resolves only when its cd certainly
// governs the exec, and is otherwise unresolved: it records no checkout rather
// than guess, because the older rule's last token picks up an interpreter such
// as /opt/homebrew/bin/bun, whose directory is itself a git checkout. So the
// script holds exactly one cd-like word; every line before the cd's is a
// prelude line (first word set, export, unset, readonly, umask, shopt or an
// assignment, and no ; & or |); on the cd's line every segment before it,
// split at ; && || and |, is a prelude segment joined by ;; the cd's segment
// starts with the word cd or pushd itself, not command cd, (cd, { cd or c"d";
// and no | follows it, since a piped cd runs in a subshell. Words are read as
// the shell reads them only when that is certain: a bare word, or one whole
// single- or double-quoted word with no escape or expansion inside, ending at
// whitespace. An unbalanced quote, mixed quoting or a $ is uncertain, and
// leaves an option or operand unresolved. A cd's operand skips cd's options
// (-L -P -e -@) up to --; a pushd's operand skips only --, so `pushd -n`, which
// does not change directory, is unresolved. The operand must be an existing
// directory, because the shell's cd fails on anything else and the shim never
// reaches its exec, and it must be the segment's last word: anything after it,
// a redirection included, leaves the shim unresolved. An absolute operand is
// the target. An operand built from the shim's own location, $(dirname "$0") or
// $(dirname "${BASH_SOURCE[0]}") with or without outer double quotes, plus a
// suffix that is empty or a literal path starting with /, is resolved against
// the directory of the path found on PATH, which is what $0 holds when the shim
// runs. The last of -L and -P picks how a `..` is read, as in the shell:
// logical (the default) removes it lexically, so the path is normalized, and
// physical follows symlinks first, so the path is kept as written for the
// operating system to resolve. Any other operand is unresolved.
export type ShimTarget =
  | { readonly kind: 'target'; readonly path: string }
  | { readonly kind: 'unresolved' }
  | null;

const CD_OPTIONS = new Set(['-L', '-P', '-e', '-@']);
const PRELUDE_COMMANDS = new Set([
  'set',
  'export',
  'unset',
  'readonly',
  'umask',
  'shopt',
]);
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const SEPARATORS = /(&&|\|\||;|\|)/;
const SELF_DIR =
  /^("?)\$\(dirname "(?:\$0|\$\{BASH_SOURCE\[0\]\})"\)(\/[^$`'"\s]*)?\1$/;

// One shell word at the start of `text`, with its quotes removed, and the text
// after it; null when the word is not certain (see the comment above).
function readWord(text: string): { word: string; rest: string } | null {
  const m = /^(?:'([^']*)'|"([^"\\$`]*)"|([^\s'"\\$`]+))(?=\s|$)\s*/.exec(text);
  if (m === null) return null;
  return {
    word: m[1] ?? m[2] ?? m[3] ?? '',
    rest: text.slice(m[0].length),
  };
}

// Looser than readWord on purpose: a word that might be a cd, in any quoting
// or after a separator character, makes the script one the parser must not
// guess at.
function cdLikeCount(text: string): number {
  return text.split(/[\s;&|]+/).filter((raw) => {
    const word = raw.replace(/["'\\]/g, '').replace(/^[$(){}`]+/, '');
    return word === 'cd' || word === 'pushd';
  }).length;
}

// Text that changes shell state without running anything or moving the
// working directory, so it may come before the cd.
function isPrelude(text: string): boolean {
  if (/[;&|]/.test(text)) return false;
  const first = readWord(text.trimStart())?.word;
  return (
    first !== undefined &&
    (PRELUDE_COMMANDS.has(first) || ASSIGNMENT.test(first))
  );
}

function cdTarget(
  command: string,
  rest: string,
  shimDir: string,
  deps: ProvenanceDeps,
): ShimTarget {
  let text = rest;
  let physical = false;
  for (;;) {
    const w = readWord(text);
    if (w === null) break;
    if (w.word === '--') {
      text = w.rest;
      break;
    }
    if (command === 'cd' && CD_OPTIONS.has(w.word)) {
      if (w.word === '-P') physical = true;
      if (w.word === '-L') physical = false;
      text = w.rest;
      continue;
    }
    break;
  }
  text = text.trim();
  const self = SELF_DIR.exec(text);
  let path: string;
  if (self !== null) {
    const suffix = self[2] ?? '';
    // join would normalize, which a physical cd must not do.
    path = physical ? shimDir + suffix : normalize(join(shimDir, suffix));
  } else {
    const operand = readWord(text);
    // text is trimmed, so anything left after the operand is another word.
    if (
      operand === null ||
      operand.rest !== '' ||
      !operand.word.startsWith('/')
    ) {
      return { kind: 'unresolved' };
    }
    path = physical ? operand.word : normalize(operand.word);
  }
  return deps.isDirectory(path)
    ? { kind: 'target', path }
    : { kind: 'unresolved' };
}

// The older rule, for a script with no cd-like word.
function lastAbsoluteToken(
  lines: readonly string[],
  deps: ProvenanceDeps,
): ShimTarget {
  for (const line of lines) {
    let last: string | null = null;
    for (const segment of line.split(/&&|\|\||;|\|/)) {
      for (const raw of segment.split(/\s+/)) {
        const token = readWord(raw)?.word;
        if (token?.startsWith('/') && deps.exists(token)) last = token;
      }
    }
    if (last !== null) return { kind: 'target', path: last };
  }
  return null;
}

export function shimTarget(file: string, deps: ProvenanceDeps): ShimTarget {
  const text = deps.readFile(file);
  if (text === null || !text.startsWith('#!')) return null;
  const lines = text
    .split('\n')
    .slice(1)
    .filter((line) => !line.trimStart().startsWith('#'));
  const counts = lines.map(cdLikeCount);
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total === 0) return lastAbsoluteToken(lines, deps);
  const unresolved: ShimTarget = { kind: 'unresolved' };
  if (total > 1) return unresolved;
  const at = counts.findIndex((n) => n > 0);
  const before = lines.slice(0, at).filter((line) => line.trim() !== '');
  if (!before.every(isPrelude)) return unresolved;
  // Alternating segments (even) and the separators between them (odd).
  const parts = (lines[at] ?? '').split(SEPARATORS);
  const k = parts.findIndex((part, i) => i % 2 === 0 && cdLikeCount(part) > 0);
  for (let i = 0; i < k; i += 2) {
    if (!isPrelude(parts[i] ?? '') || parts[i + 1] !== ';') return unresolved;
  }
  const first = readWord((parts[k] ?? '').trimStart());
  if (first === null || parts[k + 1] === '|') return unresolved;
  if (first.word !== 'cd' && first.word !== 'pushd') return unresolved;
  return cdTarget(first.word, first.rest, dirname(file), deps);
}

// What `scripts/evals-container build` baked into the image: container/Dockerfile
// re-exports its four build args as ENV. A host run has none of them. Presence
// is tested against undefined, never by truthiness: an image built by a bare
// `docker build` sets all four to the empty string, and a run in it is still a
// container run whose image identity is unknown.
function containerImageOf(
  env: ProvenanceDeps['env'],
): Provenance['container_image'] {
  const evalsCommit = env('QUORUM_IMAGE_EVALS_COMMIT');
  if (evalsCommit === undefined) return null;
  const commit = (v: string | undefined) =>
    v !== undefined && /^[0-9a-f]{40}$/.test(v) ? v : null;
  const flag = (v: string | undefined) =>
    v === 'true' ? true : v === 'false' ? false : null;
  return {
    evals_commit: commit(evalsCommit),
    container_clean: flag(env('QUORUM_IMAGE_CONTAINER_CLEAN')),
    gauntlet_commit: commit(env('QUORUM_IMAGE_GAUNTLET_COMMIT')),
    gauntlet_clean: flag(env('QUORUM_IMAGE_GAUNTLET_CLEAN')),
  };
}

export function captureProvenance(deps: ProvenanceDeps): Provenance {
  const evalsCommit = commitOf(deps.runner, deps.evalsRoot);
  const evalsClean = cleanOf(deps.runner, deps.evalsRoot, HARNESS_PATHS);
  const gauntlet: Provenance['gauntlet'] = {
    path: null,
    checkout: null,
    commit: null,
    clean: null,
  };
  const found = resolveOnPath('gauntlet', deps);
  if (found !== null) {
    gauntlet.path = found;
    const target = shimTarget(found, deps);
    // An unresolved shim records its path and nothing else: probing its own
    // directory instead is how an interpreter's checkout gets recorded.
    if (target === null || target.kind === 'target') {
      // A directory token (cd <checkout>) is queried itself; a file token or
      // the binary itself through its directory.
      const probeDir =
        target === null
          ? dirname(found)
          : deps.isDirectory(target.path)
            ? target.path
            : dirname(target.path);
      const checkout = toplevelOf(deps.runner, probeDir);
      if (checkout !== null) {
        gauntlet.checkout = checkout;
        // A gauntlet inside the evals repository (the test suite's mock is one)
        // carries the evals values: a second, whole-tree walk of the same
        // repository is the cost HARNESS_PATHS exists to avoid.
        if (checkout === toplevelOf(deps.runner, deps.evalsRoot)) {
          gauntlet.commit = evalsCommit;
          gauntlet.clean = evalsClean;
        } else {
          gauntlet.commit = commitOf(deps.runner, checkout);
          gauntlet.clean = cleanOf(deps.runner, checkout);
        }
      }
    }
  }
  return {
    evals_commit: evalsCommit,
    evals_clean: evalsClean,
    gauntlet,
    container_image: containerImageOf(deps.env),
  };
}

export function defaultProvenanceDeps(
  runner: CommandRunner,
  evalsRoot: string,
  pathVar: string,
): ProvenanceDeps {
  return {
    runner,
    evalsRoot,
    pathEntries: pathVar.split(':'),
    readFile: (p) => {
      try {
        return readFileSync(p, 'utf8');
      } catch {
        return null;
      }
    },
    exists: (p) => existsSync(p),
    isDirectory: (p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    },
    isExecutable: (p) => {
      try {
        accessSync(p, constants.X_OK);
        return statSync(p).isFile();
      } catch {
        return false;
      }
    },
    env: getEnv,
  };
}

function cell(commit: string | null, clean: boolean | null): string {
  if (commit === null) return 'unknown';
  const c = commit.slice(0, 7);
  if (clean === true) return c;
  if (clean === false) return `${c}+dirty`;
  return `${c}?`;
}

export function renderProvenanceLine(p: Provenance): string {
  const host = `provenance: evals ${cell(p.evals_commit, p.evals_clean)} gauntlet ${cell(p.gauntlet.commit, p.gauntlet.clean)}`;
  const image = p.container_image;
  if (image === null || image === undefined) return host;
  return `${host} image ${cell(image.evals_commit, image.container_clean)} gauntlet ${cell(image.gauntlet_commit, image.gauntlet_clean)}`;
}
