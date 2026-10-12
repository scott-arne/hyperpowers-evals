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

// A shim's target. On the first line after the shebang (comment lines skipped)
// that holds a cd or pushd segment, or an absolute path token that exists, the
// line decides. Segments split at ; && || and |. The command word and the
// option words are read as the shell reads them, with their quotes removed, so
// "cd" and cd "-P" are cd and cd -P. A cd's operand skips cd's options
// (-L -P -e -@) up to --; a pushd's operand skips only --, so `pushd -n`, which
// does not change directory, is unresolved. The operand must be an existing
// directory, because the shell's cd fails on anything else and the shim never
// reaches its exec. An absolute operand is the target. An operand built from
// the shim's own location, $(dirname "$0") or $(dirname "${BASH_SOURCE[0]}")
// with or without outer double quotes, plus a suffix that is empty or a literal
// path starting with /, is resolved against the directory of the path found on
// PATH, which is what $0 holds when the shim runs. The last of -L and -P picks
// how a `..` is read, as in the shell: logical (the default) removes it
// lexically, so the path is normalized, and physical follows symlinks first, so
// the path is kept as written for the operating system to resolve. Any other
// operand leaves the shim unresolved: it records no checkout rather than guess,
// because a fallback to the last absolute token picks up an interpreter such as
// /opt/homebrew/bin/bun, whose directory is itself a git checkout. A line with
// no cd or pushd keeps the older rule: its last existing absolute token. null
// is a file without a shebang (a binary), or a script with neither, and both
// are probed through the file's own directory.
export type ShimTarget =
  | { readonly kind: 'target'; readonly path: string }
  | { readonly kind: 'unresolved' }
  | null;

const CD_OPTIONS = new Set(['-L', '-P', '-e', '-@']);
const SELF_DIR =
  /^("?)\$\(dirname "(?:\$0|\$\{BASH_SOURCE\[0\]\})"\)(\/[^$`'"\s]*)?\1$/;

function unquote(raw: string): string {
  return raw.replace(/^["']+|["']+$/g, '');
}

function cdTarget(
  command: string,
  rest: string,
  shimDir: string,
  deps: ProvenanceDeps,
): ShimTarget {
  let text = rest.trim();
  let physical = false;
  for (;;) {
    const m = /^(\S+)\s*/.exec(text);
    if (m === null) break;
    const token = unquote(m[1] as string);
    if (token === '--') {
      text = text.slice(m[0].length);
      break;
    }
    if (command === 'cd' && CD_OPTIONS.has(token)) {
      if (token === '-P') physical = true;
      if (token === '-L') physical = false;
      text = text.slice(m[0].length);
      continue;
    }
    break;
  }
  text = text.trim();
  const self = SELF_DIR.exec(text);
  const operand = unquote(text.split(/\s+/)[0] ?? '');
  let path: string;
  if (self !== null) {
    const suffix = self[2] ?? '';
    // join would normalize, which a physical cd must not do.
    path = physical ? shimDir + suffix : normalize(join(shimDir, suffix));
  } else if (operand.startsWith('/')) {
    path = physical ? operand : normalize(operand);
  } else {
    return { kind: 'unresolved' };
  }
  return deps.isDirectory(path)
    ? { kind: 'target', path }
    : { kind: 'unresolved' };
}

export function shimTarget(file: string, deps: ProvenanceDeps): ShimTarget {
  const text = deps.readFile(file);
  if (text === null || !text.startsWith('#!')) return null;
  for (const line of text.split('\n').slice(1)) {
    if (line.trimStart().startsWith('#')) continue;
    let last: string | null = null;
    for (const segment of line.split(/&&|\|\||;|\|/)) {
      const word = /^\s*(\S+)(?:\s+(.*))?$/.exec(segment);
      const command = word === null ? '' : unquote(word[1] as string);
      if (command === 'cd' || command === 'pushd') {
        return cdTarget(command, word?.[2] ?? '', dirname(file), deps);
      }
      for (const raw of segment.split(/\s+/)) {
        const token = unquote(raw);
        if (token.startsWith('/') && deps.exists(token)) last = token;
      }
    }
    if (last !== null) return { kind: 'target', path: last };
  }
  return null;
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
