import { afterAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  CommandResult,
  CommandRunner,
} from '../src/agents/command-runner.ts';
import { defaultCommandRunner } from '../src/agents/command-runner.ts';
import { ProvenanceSchema } from '../src/contracts/verdict.ts';
import {
  captureProvenance,
  defaultProvenanceDeps,
  type ProvenanceDeps,
  renderProvenanceLine,
} from '../src/runner/provenance.ts';

// A run records the evals commit and the Gauntlet identity that produced it,
// so a verdict can be re-checked against the exact harness. Every lookup is
// injected: git through the CommandRunner seam, PATH and the filesystem
// through plain functions.

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

/** A git stand-in keyed by cwd: HEAD, status output, and toplevel per repo. */
function fakeGit(
  repos: Record<string, { head: string; status: string }>,
): CommandRunner {
  return {
    run(command, args): CommandResult {
      if (command !== 'git')
        return { status: 127, stdout: '', stderr: 'not found' };
      const cwd = args[1] as string;
      const repo = Object.entries(repos).find(
        ([root]) => cwd === root || cwd.startsWith(`${root}/`),
      );
      if (repo === undefined)
        return { status: 128, stdout: '', stderr: 'not a git repository' };
      const [root, r] = repo;
      const sub = args.slice(2).join(' ');
      if (sub === 'rev-parse HEAD')
        return { status: 0, stdout: `${r.head}\n`, stderr: '' };
      if (sub.startsWith('status --porcelain --untracked-files=all'))
        return { status: 0, stdout: r.status, stderr: '' };
      if (sub === 'rev-parse --show-toplevel')
        return { status: 0, stdout: `${root}\n`, stderr: '' };
      return { status: 1, stdout: '', stderr: `unexpected: ${sub}` };
    },
  };
}

function deps(
  over: Partial<ProvenanceDeps>,
  files: Record<string, string | 'dir'>,
): ProvenanceDeps {
  return {
    runner: fakeGit({}),
    evalsRoot: '/repos/evals',
    pathEntries: ['/opt/bin'],
    readFile: (p) =>
      typeof files[p] === 'string' ? (files[p] as string) : null,
    exists: (p) => p in files,
    isDirectory: (p) => files[p] === 'dir',
    isExecutable: (p) =>
      typeof files[p] === 'string' && p.endsWith('/gauntlet'),
    env: () => undefined,
    ...over,
  };
}

const realRepos: string[] = [];
afterAll(() => {
  for (const dir of realRepos) rmSync(dir, { recursive: true, force: true });
});

describe('captureProvenance', () => {
  test('clean evals checkout, host shim shape: exec bun run <checkout>/src/index.ts', () => {
    const runner = fakeGit({
      '/repos/evals': { head: A, status: '' },
      '/repos/gauntlet': { head: B, status: '' },
    });
    const p = captureProvenance(
      deps(
        { runner },
        {
          '/opt/bin/gauntlet':
            '#!/usr/bin/env bash\n# the fork\nexec bun run /repos/gauntlet/src/index.ts "$@"\n',
          '/repos/gauntlet/src/index.ts': 'x',
          '/repos/gauntlet': 'dir',
        },
      ),
    );
    expect(p).toEqual({
      evals_commit: A,
      evals_clean: true,
      gauntlet: {
        path: '/opt/bin/gauntlet',
        checkout: '/repos/gauntlet',
        commit: B,
        clean: true,
      },
      container_image: null,
    });
    expect(ProvenanceSchema.parse(p)).toEqual(p);
  });

  test('tracked-dirty and untracked-dirty both report dirty; the shebang line is never a path token', () => {
    const runner = fakeGit({
      '/repos/evals': { head: A, status: ' M src/x.ts\n' },
      '/repos/gauntlet': { head: B, status: '?? new.ts\n' },
    });
    const p = captureProvenance(
      deps(
        { runner },
        {
          '/opt/bin/gauntlet':
            '#!/usr/bin/env bash\nexec bun run /repos/gauntlet/src/index.ts "$@"\n',
          '/usr/bin/env': 'x',
          '/repos/gauntlet/src/index.ts': 'x',
        },
      ),
    );
    expect(p.evals_clean).toBe(false);
    expect(p.gauntlet.clean).toBe(false);
    expect(p.gauntlet.checkout).toBe('/repos/gauntlet');
  });

  test('a cd <abs> shim queries the directory itself, whose parent is not a repository', () => {
    const runner = fakeGit({
      '/repos/evals': { head: A, status: '' },
      '/elsewhere/checkout': { head: B, status: '' },
    });
    const p = captureProvenance(
      deps(
        { runner },
        {
          '/opt/bin/gauntlet':
            '#!/bin/sh\ncd /elsewhere/checkout && exec bun run src/index.ts "$@"\n',
          '/elsewhere/checkout': 'dir',
        },
      ),
    );
    expect(p.gauntlet.checkout).toBe('/elsewhere/checkout');
    expect(p.gauntlet.commit).toBe(B);
  });

  test('a real binary (no shebang) resolves through its own directory', () => {
    const runner = fakeGit({
      '/repos/evals': { head: A, status: '' },
      '/repos/gauntlet': { head: B, status: '' },
    });
    const p = captureProvenance(
      deps(
        { runner },
        {
          '/repos/gauntlet/bin/gauntlet': '\u007fELF',
          '/repos/gauntlet': 'dir',
        },
      ),
    );
    expect(p.gauntlet.path).toBeNull();
    const p2 = captureProvenance(
      deps(
        { runner, pathEntries: ['/repos/gauntlet/bin'] },
        {
          '/repos/gauntlet/bin/gauntlet': '\u007fELF',
          '/repos/gauntlet': 'dir',
        },
      ),
    );
    expect(p2.gauntlet).toEqual({
      path: '/repos/gauntlet/bin/gauntlet',
      checkout: '/repos/gauntlet',
      commit: B,
      clean: true,
    });
  });

  test('an interpreter named by absolute path does not stand in for the checkout', () => {
    const C = 'c'.repeat(40);
    const runner = fakeGit({
      '/repos/evals': { head: A, status: '' },
      '/repos/gauntlet': { head: B, status: '' },
      '/opt/homebrew': { head: C, status: '' },
    });
    const p = captureProvenance(
      deps(
        { runner },
        {
          '/opt/bin/gauntlet':
            '#!/bin/sh\nexec /opt/homebrew/bin/bun run /repos/gauntlet/src/index.ts "$@"\n',
          '/opt/homebrew/bin/bun': 'x',
          '/repos/gauntlet/src/index.ts': 'x',
        },
      ),
    );
    expect(p.gauntlet).toEqual({
      path: '/opt/bin/gauntlet',
      checkout: '/repos/gauntlet',
      commit: B,
      clean: true,
    });
  });

  test('a cd operand names the checkout even when an absolute interpreter follows it', () => {
    const C = 'c'.repeat(40);
    const runner = fakeGit({
      '/repos/evals': { head: A, status: '' },
      '/repos/gauntlet': { head: B, status: '' },
      '/opt/homebrew': { head: C, status: '' },
    });
    const p = captureProvenance(
      deps(
        { runner },
        {
          '/opt/bin/gauntlet':
            '#!/bin/sh\ncd /repos/gauntlet && exec /opt/homebrew/bin/bun run src/index.ts "$@"\n',
          '/repos/gauntlet': 'dir',
          '/opt/homebrew/bin/bun': 'x',
        },
      ),
    );
    expect(p.gauntlet).toEqual({
      path: '/opt/bin/gauntlet',
      checkout: '/repos/gauntlet',
      commit: B,
      clean: true,
    });
  });

  test('a gauntlet on PATH outside any repository keeps its path and nulls the rest', () => {
    const runner = fakeGit({ '/repos/evals': { head: A, status: '' } });
    const p = captureProvenance(
      deps(
        { runner },
        {
          '/opt/bin/gauntlet':
            '#!/bin/sh\nexec bun run /loose/gauntlet/src/index.ts "$@"\n',
          '/loose/gauntlet/src/index.ts': 'x',
        },
      ),
    );
    expect(p.gauntlet).toEqual({
      path: '/opt/bin/gauntlet',
      checkout: null,
      commit: null,
      clean: null,
    });
    expect(p.evals_commit).toBe(A);
  });

  test('a HEAD that is not a 40-hex commit id records no commit', () => {
    const runner: CommandRunner = {
      run(command, args): CommandResult {
        const sub = args.slice(2).join(' ');
        if (command === 'git' && sub === 'rev-parse HEAD')
          return { status: 0, stdout: 'HEAD\n', stderr: '' };
        if (
          command === 'git' &&
          sub.startsWith('status --porcelain --untracked-files=all')
        )
          return { status: 0, stdout: '', stderr: '' };
        return { status: 1, stdout: '', stderr: 'unexpected' };
      },
    };
    const p = captureProvenance(deps({ runner }, {}));
    expect(p.evals_commit).toBeNull();
    expect(p.evals_clean).toBe(true);
  });

  test('an exit status of 0 with empty toplevel output records no checkout', () => {
    const runner: CommandRunner = {
      run(command, args): CommandResult {
        const sub = args.slice(2).join(' ');
        if (command === 'git' && sub === 'rev-parse --show-toplevel')
          return { status: 0, stdout: '\n', stderr: '' };
        if (command === 'git' && sub === 'rev-parse HEAD')
          return { status: 0, stdout: `${A}\n`, stderr: '' };
        if (
          command === 'git' &&
          sub.startsWith('status --porcelain --untracked-files=all')
        )
          return { status: 0, stdout: '', stderr: '' };
        return { status: 1, stdout: '', stderr: 'unexpected' };
      },
    };
    const p = captureProvenance(
      deps(
        { runner },
        {
          '/opt/bin/gauntlet':
            '#!/bin/sh\nexec bun run /repos/gauntlet/src/index.ts "$@"\n',
          '/repos/gauntlet/src/index.ts': 'x',
        },
      ),
    );
    expect(p.gauntlet).toEqual({
      path: '/opt/bin/gauntlet',
      checkout: null,
      commit: null,
      clean: null,
    });
  });

  test('the evals clean check is limited to the harness paths; the Gauntlet check covers its whole checkout', () => {
    const calls: string[] = [];
    const inner = fakeGit({
      '/repos/evals': { head: A, status: '' },
      '/repos/gauntlet': { head: B, status: '' },
    });
    const runner: CommandRunner = {
      run(command, args): CommandResult {
        calls.push(args.join(' '));
        return inner.run(command, args);
      },
    };
    captureProvenance(
      deps(
        { runner },
        {
          '/opt/bin/gauntlet':
            '#!/bin/sh\nexec bun run /repos/gauntlet/src/index.ts "$@"\n',
          '/repos/gauntlet/src/index.ts': 'x',
        },
      ),
    );
    expect(calls.filter((c) => c.includes(' status '))).toEqual([
      '-C /repos/evals status --porcelain --untracked-files=all -- src coding-agents package.json bun.lock bunfig.toml tsconfig.json container scripts/evals-container scenarios fixtures',
      '-C /repos/gauntlet status --porcelain --untracked-files=all',
    ]);
  });

  test('a gauntlet inside the evals repository carries the evals values without a second status walk', () => {
    const calls: string[] = [];
    const inner = fakeGit({
      '/repos/evals': { head: A, status: ' M src/x.ts\n' },
    });
    const runner: CommandRunner = {
      run(command, args): CommandResult {
        calls.push(args.join(' '));
        return inner.run(command, args);
      },
    };
    const p = captureProvenance(
      deps(
        { runner, pathEntries: ['/repos/evals/test/mock-gauntlet'] },
        {
          '/repos/evals/test/mock-gauntlet/gauntlet':
            '#!/usr/bin/env bash\nexec bun "$(dirname "$0")/mock-gauntlet.ts" "$@"\n',
        },
      ),
    );
    expect(p.evals_clean).toBe(false);
    expect(p.gauntlet).toEqual({
      path: '/repos/evals/test/mock-gauntlet/gauntlet',
      checkout: '/repos/evals',
      commit: A,
      clean: false,
    });
    expect(calls.filter((c) => c.includes(' status ')).length).toBe(1);
  });

  test('git absent and gauntlet off PATH yield nulls, never a throw', () => {
    const runner: CommandRunner = {
      run: () => ({ status: null, stdout: '', stderr: 'spawn git ENOENT' }),
    };
    const p = captureProvenance(
      deps({ runner, pathEntries: ['/nowhere', ''] }, {}),
    );
    expect(p).toEqual({
      evals_commit: null,
      evals_clean: null,
      gauntlet: { path: null, checkout: null, commit: null, clean: null },
      container_image: null,
    });
  });

  test('ignored-only is clean, a file outside the harness paths does not count, an untracked fixture, Bun config or container launcher file does, and status.showUntrackedFiles=no cannot hide an untracked harness file (real git)', () => {
    const repo = mkdtempSync(join(tmpdir(), 'prov-'));
    realRepos.push(repo);
    const g = (...args: string[]) =>
      spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
    g('init', '-q');
    g('config', 'user.email', 't@t');
    g('config', 'user.name', 't');
    g('config', 'status.showUntrackedFiles', 'no');
    writeFileSync(join(repo, '.gitignore'), 'ignored.txt\n');
    g('add', '.gitignore');
    g('-c', 'commit.gpgsign=false', 'commit', '-qm', 'init');
    mkdirSync(join(repo, 'src'));
    mkdirSync(join(repo, 'docs'));
    const real = defaultProvenanceDeps(defaultCommandRunner, repo, '');
    writeFileSync(join(repo, 'src', 'ignored.txt'), 'x');
    expect(captureProvenance(real).evals_clean).toBe(true);
    writeFileSync(join(repo, 'docs', 'note.md'), 'x');
    expect(captureProvenance(real).evals_clean).toBe(true);
    mkdirSync(join(repo, 'fixtures', 'template-repo'), { recursive: true });
    writeFileSync(join(repo, 'fixtures', 'template-repo', 'README.md'), 'x');
    expect(captureProvenance(real).evals_clean).toBe(false);
    rmSync(join(repo, 'fixtures'), { recursive: true, force: true });
    expect(captureProvenance(real).evals_clean).toBe(true);
    for (const config of ['bunfig.toml', 'tsconfig.json']) {
      writeFileSync(join(repo, config), 'x');
      expect(captureProvenance(real).evals_clean).toBe(false);
      rmSync(join(repo, config), { force: true });
      expect(captureProvenance(real).evals_clean).toBe(true);
    }
    mkdirSync(join(repo, 'container', 'bin'), { recursive: true });
    writeFileSync(join(repo, 'container', 'bin', 'quorum'), 'x');
    expect(captureProvenance(real).evals_clean).toBe(false);
    rmSync(join(repo, 'container'), { recursive: true, force: true });
    expect(captureProvenance(real).evals_clean).toBe(true);
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    writeFileSync(join(repo, 'scripts', 'evals-container'), 'x');
    expect(captureProvenance(real).evals_clean).toBe(false);
    writeFileSync(join(repo, 'scripts', 'strip-runs'), 'x');
    rmSync(join(repo, 'scripts', 'evals-container'), { force: true });
    expect(captureProvenance(real).evals_clean).toBe(true);
    rmSync(join(repo, 'scripts'), { recursive: true, force: true });
    writeFileSync(join(repo, 'src', 'untracked.ts'), 'x');
    expect(captureProvenance(real).evals_clean).toBe(false);
  });
});

describe('container image identity', () => {
  const NAMES = [
    'QUORUM_IMAGE_EVALS_COMMIT',
    'QUORUM_IMAGE_CONTAINER_CLEAN',
    'QUORUM_IMAGE_GAUNTLET_COMMIT',
    'QUORUM_IMAGE_GAUNTLET_CLEAN',
  ] as const;
  const capture = (values: Partial<Record<(typeof NAMES)[number], string>>) =>
    captureProvenance(
      deps(
        {
          runner: fakeGit({ '/repos/evals': { head: A, status: '' } }),
          env: (name) => values[name as (typeof NAMES)[number]],
        },
        {},
      ),
    );

  test('a host run, with the variables unset, records container_image null and keeps the host line', () => {
    const p = capture({});
    expect(p.container_image).toBeNull();
    expect(renderProvenanceLine(p)).toBe(
      'provenance: evals aaaaaaa gauntlet unknown',
    );
    expect(ProvenanceSchema.parse(p)).toEqual(p);
  });

  test('an image built without the launcher (four empty strings) is still a container run, with four nulls', () => {
    const p = capture({
      QUORUM_IMAGE_EVALS_COMMIT: '',
      QUORUM_IMAGE_CONTAINER_CLEAN: '',
      QUORUM_IMAGE_GAUNTLET_COMMIT: '',
      QUORUM_IMAGE_GAUNTLET_CLEAN: '',
    });
    expect(p.container_image).toEqual({
      evals_commit: null,
      container_clean: null,
      gauntlet_commit: null,
      gauntlet_clean: null,
    });
    expect(renderProvenanceLine(p)).toBe(
      'provenance: evals aaaaaaa gauntlet unknown image unknown gauntlet unknown',
    );
    expect(ProvenanceSchema.parse(p)).toEqual(p);
  });

  test('valid values are recorded and rendered with the cell forms', () => {
    const p = capture({
      QUORUM_IMAGE_EVALS_COMMIT: A,
      QUORUM_IMAGE_CONTAINER_CLEAN: 'false',
      QUORUM_IMAGE_GAUNTLET_COMMIT: B,
      QUORUM_IMAGE_GAUNTLET_CLEAN: 'true',
    });
    expect(p.container_image).toEqual({
      evals_commit: A,
      container_clean: false,
      gauntlet_commit: B,
      gauntlet_clean: true,
    });
    expect(renderProvenanceLine(p)).toBe(
      'provenance: evals aaaaaaa gauntlet unknown image aaaaaaa+dirty gauntlet bbbbbbb',
    );
  });

  test('malformed values become null field by field', () => {
    const p = capture({
      QUORUM_IMAGE_EVALS_COMMIT: 'HEAD',
      QUORUM_IMAGE_CONTAINER_CLEAN: 'yes',
      QUORUM_IMAGE_GAUNTLET_COMMIT: `${B}\n`,
      QUORUM_IMAGE_GAUNTLET_CLEAN: 'TRUE',
    });
    expect(p.container_image).toEqual({
      evals_commit: null,
      container_clean: null,
      gauntlet_commit: null,
      gauntlet_clean: null,
    });
  });

  test('a verdict written before the field existed still parses, and renders without image cells', () => {
    const old = {
      evals_commit: A,
      evals_clean: true,
      gauntlet: { path: null, checkout: null, commit: null, clean: null },
    };
    expect(ProvenanceSchema.parse(old)).toEqual(old);
    expect(renderProvenanceLine(old)).toBe(
      'provenance: evals aaaaaaa gauntlet unknown',
    );
  });
});

describe('shim forms', () => {
  const C = 'c'.repeat(40);
  const D = 'd'.repeat(40);
  const E = 'e'.repeat(40);
  const F = 'f'.repeat(40);
  // /opt/homebrew and /opt are repositories here, so any fallback to the last
  // absolute token, or to the shim's own directory, records the wrong commit.
  // /repos/a stands for what a symlink named a leads to: a path that keeps
  // `a/..` as written probes it, where the lexically normalized one does not.
  const runner = fakeGit({
    '/repos/evals': { head: A, status: '' },
    '/repos/gauntlet': { head: B, status: '' },
    '/repos/tools': { head: D, status: '' },
    '/repos/a': { head: E, status: '' },
    // Shares a prefix with /repos/gauntlet up to the space, which is where a
    // whitespace split cuts a quoted path.
    '/repos/gauntlet worktree': { head: F, status: '' },
    '/opt/homebrew': { head: C, status: '' },
    '/opt': { head: C, status: '' },
  });
  const shimAt = (
    file: string,
    body: string,
    extra: Record<string, string | 'dir'> = {},
  ) =>
    captureProvenance(
      deps(
        { runner, pathEntries: [file.slice(0, file.lastIndexOf('/'))] },
        {
          [file]: `#!/bin/sh\n${body}\n`,
          '/repos/gauntlet': 'dir',
          '/repos/tools': 'dir',
          '/opt/homebrew/bin/bun': 'x',
          ...extra,
        },
      ),
    ).gauntlet;
  const resolved = (path: string) => ({
    path,
    checkout: '/repos/gauntlet',
    commit: B,
    clean: true,
  });
  const unresolved = (path: string) => ({
    path,
    checkout: null,
    commit: null,
    clean: null,
  });
  const exec = 'exec /opt/homebrew/bin/bun run src/index.ts "$@"';
  const trap = ` && ${exec}`;

  test.each([
    ['cd -P', `cd -P /repos/gauntlet${trap}`],
    ['cd -L -P', `cd -L -P /repos/gauntlet${trap}`],
    ['cd --', `cd -- /repos/gauntlet${trap}`],
    ['pushd', `pushd /repos/gauntlet${trap}`],
    [
      'cd X;exec',
      'cd /repos/gauntlet;exec /opt/homebrew/bin/bun run src/index.ts "$@"',
    ],
    // Quote removal turns each of these into the plain word.
    ['a quoted cd', `"cd" /repos/gauntlet${trap}`],
    ['a quoted pushd', `'pushd' /repos/gauntlet${trap}`],
    ['a quoted -P', `cd "-P" /repos/gauntlet${trap}`],
    ['a quoted --', `cd '--' /repos/gauntlet${trap}`],
  ])('%s names the checkout', (_label, body) => {
    expect(shimAt('/opt/bin/gauntlet', body)).toEqual(
      resolved('/opt/bin/gauntlet'),
    );
  });

  test.each([
    [
      'the parent through /..',
      '/repos/gauntlet/bin/gauntlet',
      `cd "$(dirname "$0")/.."${trap}`,
    ],
    [
      'the empty suffix',
      '/repos/gauntlet/bin/gauntlet',
      `cd "$(dirname "$0")"${trap}`,
    ],
    [
      'BASH_SOURCE',
      '/repos/gauntlet/bin/gauntlet',
      `cd "$(dirname "\${BASH_SOURCE[0]}")/.."${trap}`,
    ],
    [
      'the unquoted form',
      '/repos/gauntlet/bin/gauntlet',
      `cd $(dirname "$0")/..${trap}`,
    ],
    [
      'another repository',
      '/repos/tools/bin/gauntlet',
      `cd "$(dirname "$0")/../../gauntlet"${trap}`,
    ],
  ])('a cd built from the shim location resolves exactly: %s', (_label, file, body) => {
    expect(
      shimAt(file, body, {
        '/repos/gauntlet/bin': 'dir',
        '/repos/tools/bin': 'dir',
      }),
    ).toEqual(resolved(file));
  });

  test.each([
    ['a variable', `cd "$HOME/gauntlet"${trap}`],
    ['a relative operand', `cd gauntlet${trap}`],
    ['cd -', `cd -${trap}`],
    ['pushd -n', `pushd -n /repos/gauntlet${trap}`],
    ['a variable suffix', `cd "$(dirname "$0")/$SUB"${trap}`],
    ['a suffix without a leading slash', `cd "$(dirname "$0")suffix"${trap}`],
    ['a nested substitution', `cd "$(dirname "$(readlink -f "$0")")"${trap}`],
    // /repos/gauntlet is a directory, so a fragment read off an uncertain word
    // would resolve to it.
    ['an unbalanced operand', `cd "/repos/gauntlet${trap}`],
    ['mixed quoting', `cd /repos/"gauntlet"${trap}`],
    ['an expansion in double quotes', `cd "/repos/$X"${trap}`],
    ['an unbalanced option word', `cd "-P /repos/gauntlet${trap}`],
    // bash refuses a second operand, and a redirection is more text after the
    // operand: either way the operand is not the whole of what cd was given.
    ['a second operand', `cd /repos/gauntlet /repos/tools${trap}`],
    ['a redirection', `cd /repos/gauntlet >/dev/null${trap}`],
  ])('an unresolved cd records no checkout: %s', (_label, body) => {
    expect(shimAt('/opt/bin/gauntlet', body)).toEqual(
      unresolved('/opt/bin/gauntlet'),
    );
  });

  // Each of these runs the exec from a directory the parser cannot name: the
  // cd is skipped, repeated, conditional, in a subshell, or not the command
  // the line starts with. /opt/homebrew is a repository, so a fallback to the
  // last absolute token records the wrong commit.
  test.each([
    ['a mixed-quoted command word', `c"d" /repos/gauntlet${trap}`],
    ['a backslash command word', `\\cd /repos/gauntlet${trap}`],
    [
      'a conditional alternative',
      `false && cd /repos/tools || cd /repos/gauntlet; ${exec}`,
    ],
    ['a cd after &&', `true && cd /repos/gauntlet; ${exec}`],
    ['a piped cd', `cd /repos/gauntlet | cat; ${exec}`],
    ['a subshell', `(cd /repos/gauntlet && ${exec})`],
    ['a brace group', `{ cd /repos/gauntlet; ${exec}; }`],
    ['command cd', `command cd /repos/gauntlet${trap}`],
    ['a second cd', `cd /repos/gauntlet; cd /repos/tools; ${exec}`],
    [
      'a second cd with no space before it',
      `cd /repos/gauntlet;cd /repos/tools; ${exec}`,
    ],
    ['a cd inside an if', `if false; then\n  cd /repos/gauntlet\nfi\n${exec}`],
    [
      'a source line before the cd',
      `source /etc/profile\ncd /repos/gauntlet${trap}`,
    ],
    ['an exec line before the cd', `exec true\ncd /repos/gauntlet${trap}`],
  ])('a cd that may not govern the exec records no checkout: %s', (_label, body) => {
    expect(shimAt('/opt/bin/gauntlet', body)).toEqual(
      unresolved('/opt/bin/gauntlet'),
    );
  });

  test.each([
    ['set on its own line', `set -euo pipefail\ncd /repos/gauntlet${trap}`],
    ['set and the cd joined by ;', `set -e; cd /repos/gauntlet; ${exec}`],
    ['cd || exit before the exec', `cd /repos/gauntlet || exit 1\n${exec}`],
    ['export before the cd', `export X=1\ncd /repos/gauntlet${trap}`],
    ['an assignment before the cd', `X=1\ncd /repos/gauntlet${trap}`],
    [
      'blank and comment lines before the cd',
      `\n# note\nset -e\n\ncd /repos/gauntlet${trap}`,
    ],
  ])('a leading unconditional cd names the checkout: %s', (_label, body) => {
    expect(shimAt('/opt/bin/gauntlet', body)).toEqual(
      resolved('/opt/bin/gauntlet'),
    );
  });

  test.each([
    ['double quotes', `cd "/repos/gauntlet worktree"${trap}`],
    ['single quotes', `cd '/repos/gauntlet worktree'${trap}`],
  ])('a quoted operand with a space resolves to the full path: %s', (_label, body) => {
    expect(
      shimAt('/opt/bin/gauntlet', body, { '/repos/gauntlet worktree': 'dir' }),
    ).toEqual({
      path: '/opt/bin/gauntlet',
      checkout: '/repos/gauntlet worktree',
      commit: F,
      clean: true,
    });
  });

  test('a token with an unbalanced quote is skipped by the older rule, not stripped to a path', () => {
    const found = shimAt('/opt/bin/gauntlet', 'exec "/repos/gauntlet');
    expect(found.checkout).not.toBe('/repos/gauntlet');
    expect(found.commit).not.toBe(B);
  });

  // bash's cd fails on a file, so the shim never reaches its exec; the parent
  // directory of that file is not where the shim runs.
  test.each([
    ['a missing directory', `cd /repos/missing${trap}`, {}],
    [
      'an absolute file',
      `cd /repos/gauntlet/package.json${trap}`,
      { '/repos/gauntlet/package.json': 'x' },
    ],
    [
      'pushd on an absolute file',
      `pushd /repos/gauntlet/package.json${trap}`,
      { '/repos/gauntlet/package.json': 'x' },
    ],
    [
      'a self-directory operand that resolves to the shim file',
      `cd "$(dirname "$0")/gauntlet"${trap}`,
      { '/repos/gauntlet/bin': 'dir' },
    ],
  ])('a cd operand that is not a directory records no checkout: %s', (_label, body, extra) => {
    const file = body.includes('dirname')
      ? '/repos/gauntlet/bin/gauntlet'
      : '/opt/bin/gauntlet';
    expect(shimAt(file, body, extra)).toEqual(unresolved(file));
  });

  // Each spelling is a directory here, so existence is not what decides: the
  // path string the target carries is, through the repository the probe finds.
  const physicalA = (path: string) => ({
    path,
    checkout: '/repos/a',
    commit: E,
    clean: true,
  });
  const throughA = { '/repos/a/../gauntlet': 'dir' } as const;

  test.each([
    ['the default is logical', 'cd /repos/a/../gauntlet'],
    ['-L', 'cd -L /repos/a/../gauntlet'],
    ['-P then -L: the last wins', 'cd -P -L /repos/a/../gauntlet'],
    ['-L -P -L: the last wins', 'cd -L -P -L /repos/a/../gauntlet'],
    ['pushd', 'pushd /repos/a/../gauntlet'],
    ['a quoted -L after -P', 'cd -P "-L" /repos/a/../gauntlet'],
  ])('an absolute operand is normalized lexically: %s', (_label, cd) => {
    expect(shimAt('/opt/bin/gauntlet', `${cd}${trap}`, throughA)).toEqual(
      resolved('/opt/bin/gauntlet'),
    );
  });

  test.each([
    ['-P', 'cd -P /repos/a/../gauntlet'],
    ['-L then -P: the last wins', 'cd -L -P /repos/a/../gauntlet'],
    ['-P -L -P: the last wins', 'cd -P -L -P /repos/a/../gauntlet'],
    ['-P after -e', 'cd -e -P /repos/a/../gauntlet'],
    ['a quoted -P', 'cd -L "-P" /repos/a/../gauntlet'],
  ])('-P keeps an absolute operand as written: %s', (_label, cd) => {
    expect(shimAt('/opt/bin/gauntlet', `${cd}${trap}`, throughA)).toEqual(
      physicalA('/opt/bin/gauntlet'),
    );
  });

  const fromTools = {
    '/repos/tools/bin': 'dir',
    '/repos/tools/bin/../../gauntlet': 'dir',
  } as const;
  const toolsBin = '/repos/tools/bin/gauntlet';

  test.each([
    ['the default is logical', 'cd'],
    ['-L', 'cd -L'],
    ['-L -P -L: the last wins', 'cd -L -P -L'],
  ])('a self-directory operand is normalized lexically: %s', (_label, cd) => {
    expect(
      shimAt(
        toolsBin,
        `${cd} "$(dirname "$0")/../../gauntlet"${trap}`,
        fromTools,
      ),
    ).toEqual(resolved(toolsBin));
  });

  test.each([
    ['-P', 'cd -P'],
    ['-L -P: the last wins', 'cd -L -P'],
  ])('-P appends the suffix to the shim directory as written: %s', (_label, cd) => {
    expect(
      shimAt(
        toolsBin,
        `${cd} "$(dirname "$0")/../../gauntlet"${trap}`,
        fromTools,
      ),
    ).toEqual({
      path: toolsBin,
      checkout: '/repos/tools',
      commit: D,
      clean: true,
    });
  });
});

describe('renderProvenanceLine', () => {
  const g = (commit: string | null, clean: boolean | null) => ({
    path: null,
    checkout: null,
    commit,
    clean,
  });
  test('the four cells', () => {
    expect(
      renderProvenanceLine({
        evals_commit: A,
        evals_clean: true,
        gauntlet: g(B, false),
      }),
    ).toBe('provenance: evals aaaaaaa gauntlet bbbbbbb+dirty');
    expect(
      renderProvenanceLine({
        evals_commit: A,
        evals_clean: null,
        gauntlet: g(null, null),
      }),
    ).toBe('provenance: evals aaaaaaa? gauntlet unknown');
  });
});
