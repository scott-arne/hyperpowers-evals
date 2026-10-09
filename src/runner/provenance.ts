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

// Clean means `git status --porcelain --untracked-files=all` prints nothing:
// untracked files count, ignored files do not, and the explicit flag keeps a
// status.showUntrackedFiles=no setting from hiding them.
function cleanOf(runner: CommandRunner, cwd: string): boolean | null {
  const out = gitOut(runner, cwd, [
    'status',
    '--porcelain',
    '--untracked-files=all',
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
// is the other common one. The first absolute path token that exists, read
// after the shebang line and skipping comment lines, is the target. A file
// without a shebang is the binary itself and resolves through its own dir.
export function shimTarget(file: string, deps: ProvenanceDeps): string | null {
  const text = deps.readFile(file);
  if (text === null || !text.startsWith('#!')) return null;
  const lines = text.split('\n').slice(1);
  for (const line of lines) {
    if (line.trimStart().startsWith('#')) continue;
    for (const raw of line.split(/\s+/)) {
      const token = raw.replace(/^["']+|["']+$/g, '');
      if (token.startsWith('/') && deps.exists(token)) return token;
    }
  }
  return null;
}

export function captureProvenance(deps: ProvenanceDeps): Provenance {
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
      gauntlet.commit = commitOf(deps.runner, checkout);
      gauntlet.clean = cleanOf(deps.runner, checkout);
    }
  }
  return {
    evals_commit: commitOf(deps.runner, deps.evalsRoot),
    evals_clean: cleanOf(deps.runner, deps.evalsRoot),
    gauntlet,
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
