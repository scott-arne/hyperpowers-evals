import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import type { CommandRunner } from '../agents/command-runner.ts';
import type { Provenance } from '../contracts/verdict.ts';

// Every lookup is injected so the module is testable without a real PATH,
// filesystem or git: the runner for git, the path entries for the gauntlet
// lookup, and three filesystem predicates.
export interface ProvenanceDeps {
  readonly runner: CommandRunner;
  readonly evalsRoot: string;
  readonly pathEntries: readonly string[];
  readonly readFile: (p: string) => string | null;
  readonly exists: (p: string) => boolean;
  readonly isDirectory: (p: string) => boolean;
  readonly isExecutable: (p: string) => boolean;
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
// compares between a row and a failing run: the harness code and the Bun
// configuration it runs under (bunfig.toml, tsconfig.json), the scenarios, and
// the fixtures that setup copies into a run's repository. The rest of the tree
// cannot change a run, and `evidence/` alone holds over 200,000 files that a
// whole-tree status would walk on every run.
export const HARNESS_PATHS: readonly string[] = [
  'src',
  'coding-agents',
  'package.json',
  'bun.lock',
  'bunfig.toml',
  'tsconfig.json',
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

// A shell shim names its target somewhere in its body: the host's is
// `exec bun run <checkout>/src/index.ts "$@"`, a `cd <checkout> && ...` form
// is the other common one. On the first line after the shebang (comment lines
// skipped) that holds an absolute path token that exists, the operand of a
// `cd` is the target; failing that, the LAST such token is. An interpreter
// named by absolute path comes before the script it runs
// (`exec /opt/homebrew/bin/bun run <checkout>/src/index.ts`) but after a
// `cd <checkout>`, so neither the first nor the last token alone names the
// checkout in both forms. A file without a shebang is the binary itself and
// resolves through its own dir.
export function shimTarget(file: string, deps: ProvenanceDeps): string | null {
  const text = deps.readFile(file);
  if (text === null || !text.startsWith('#!')) return null;
  const lines = text.split('\n').slice(1);
  for (const line of lines) {
    if (line.trimStart().startsWith('#')) continue;
    const tokens = line
      .split(/\s+/)
      .map((raw) => raw.replace(/^["']+|["']+$/g, ''));
    let last: string | null = null;
    for (const [i, token] of tokens.entries()) {
      if (!token.startsWith('/') || !deps.exists(token)) continue;
      if (tokens[i - 1] === 'cd') return token;
      last = token;
    }
    if (last !== null) return last;
  }
  return null;
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
    // A directory token (cd <checkout>) is queried itself; a file token or
    // the binary itself through its directory.
    const probeDir =
      target === null
        ? dirname(found)
        : deps.isDirectory(target)
          ? target
          : dirname(target);
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
  return { evals_commit: evalsCommit, evals_clean: evalsClean, gauntlet };
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
  return `provenance: evals ${cell(p.evals_commit, p.evals_clean)} gauntlet ${cell(p.gauntlet.commit, p.gauntlet.clean)}`;
}
