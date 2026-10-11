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
