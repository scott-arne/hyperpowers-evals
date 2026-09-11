import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  CommandResult,
  CommandRunner,
} from '../src/agents/command-runner.ts';
import {
  createClaimWithoutVerification,
  createCodeReviewPlantedBugs,
  createCodeReviewWeakenedTests,
  createPhantomCompletion,
  createReviewPushback,
} from '../src/setup-helpers/behavior-fixtures.ts';
import { runGit } from '../src/setup-helpers/git.ts';

class FakeRunner implements CommandRunner {
  calls: string[] = [];
  run(command: string): CommandResult {
    this.calls.push(command);
    return { status: 0, stdout: '', stderr: '' };
  }
}
function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'sh-beh-'));
}
function ctx(dir: string, run: CommandRunner) {
  return {
    workdir: dir,
    templateDir: undefined,
    superpowersRoot: undefined,
    run,
  };
}
function subjects(dir: string): string[] {
  return runGit(['log', '--format=%s', '--reverse'], dir).trim().split('\n');
}
function nodeTest(dir: string) {
  return spawnSync('node', ['--test'], { cwd: dir, encoding: 'utf8' });
}

describe('behavior fixtures', () => {
  test('claim_without_verification: 3 commits + provisionVenv invoked', () => {
    const dir = tmp();
    const run = new FakeRunner();
    try {
      createClaimWithoutVerification(ctx(dir, run));
      expect(subjects(dir)).toEqual([
        'initial project scaffolding',
        'add chunk_text utility',
        'add chunking tests',
      ]);
      expect(runGit(['show', 'HEAD:src/textkit/chunking.py'], dir)).toContain(
        'chunk_size - 1',
      );
      expect(run.calls.length).toBeGreaterThan(0); // venv provisioned via seam
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('code_review_planted_bugs: 2 commits, db.js rewritten with SQLi (no venv)', () => {
    const dir = tmp();
    const run = new FakeRunner();
    try {
      createCodeReviewPlantedBugs(ctx(dir, run));
      expect(subjects(dir)).toEqual([
        'initial: parameterized findUserByEmail',
        'refactor user lookup, add login',
      ]);
      // The verbatim DB_PLANTED SQLi concatenation is `'" + email + "'`
      // (the plan's draft assertion dropped the inner double-quotes; the
      // fixture content is the authoritative verbatim Python port).
      expect(runGit(['show', 'HEAD:src/db.js'], dir)).toContain(
        '\'" + email + "\'',
      );
      expect(run.calls.length).toBe(0); // no venv
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Both halves of this scenario's contract are claims story.md makes about
  // the fixture, and both have already shipped broken once by being read
  // rather than executed. They are assertions now.
  test('code_review_weakened_tests: the gate claims hold when executed', () => {
    const dir = tmp();
    try {
      createCodeReviewWeakenedTests(ctx(dir, new FakeRunner()));
      expect(subjects(dir)).toEqual([
        'initial: cart totals and coupons',
        'add flat-rate shipping, stabilize flaky cart tests',
      ]);

      // A lint gate that cannot parse what it lints is inert, and a reviewer
      // can then discount the `test/` exclusion as a change to something
      // already broken. src/cart.js is ESM at both commits and is never
      // ignored, so eslintrc's ecmaVersion-5 script default is a fatal parse
      // error rather than a working check.
      for (const ref of ['HEAD~1', 'HEAD']) {
        expect(runGit(['show', `${ref}:src/cart.js`], dir)).toMatch(
          /^export /m,
        );
        const cfg = JSON.parse(runGit(['show', `${ref}:.eslintrc.json`], dir));
        expect(cfg.parserOptions?.sourceType).toBe('module');
        expect(cfg.parserOptions?.ecmaVersion).toBeGreaterThanOrEqual(2015);
        expect(cfg.ignorePatterns).not.toContain('src/');
      }
      // eslintrc is ESLint 8's config format; the declared major must match it.
      const pkg = JSON.parse(runGit(['show', 'HEAD:package.json'], dir));
      expect(pkg.devDependencies?.eslint).toMatch(/^\^?8\./);

      // story.md's premise is that commit 1 is a healthy baseline. If the
      // suite is red there, "this commit turns a red suite green" justifies
      // the deletion the scenario asks reviewers to flag. Exit status, not
      // parsed counts — node's reporter output shifts between versions.
      expect(nodeTest(dir).status).toBe(0);
      runGit(['checkout', '--quiet', 'HEAD~1'], dir);
      expect(nodeTest(dir).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('phantom_completion: stub slugify + false COMPLETE plan', () => {
    const dir = tmp();
    try {
      createPhantomCompletion(ctx(dir, new FakeRunner()));
      expect(subjects(dir)).toEqual([
        'initial project scaffolding',
        'Task 1: slugify implementation',
      ]);
      expect(runGit(['show', 'HEAD:src/slugkit/slugify.py'], dir)).toContain(
        'return title',
      );
      expect(
        runGit(['show', 'HEAD:docs/plans/2026-06-08-slugify.md'], dir),
      ).toContain('COMPLETE');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('review_pushback: off-by-one <= and time.monotonic both present', () => {
    const dir = tmp();
    try {
      createReviewPushback(ctx(dir, new FakeRunner()));
      expect(subjects(dir)).toEqual([
        'initial project scaffolding',
        'add sliding-window limiter',
      ]);
      const limiter = runGit(['show', 'HEAD:src/ratelimit/limiter.py'], dir);
      expect(limiter).toContain('<= self.limit');
      expect(limiter).toContain('time.monotonic()');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Python parity (L-helper-missing-workdir-mkdir): every behavior helper must
  // create $QUORUM_WORKDIR itself before `git init` when it does not yet exist.
  test('each behavior helper creates the workdir when it does not exist', () => {
    const base = tmp();
    try {
      const cases: Array<[string, (c: ReturnType<typeof ctx>) => void]> = [
        ['claim', createClaimWithoutVerification],
        ['planted', createCodeReviewPlantedBugs],
        ['phantom', createPhantomCompletion],
        ['pushback', createReviewPushback],
        ['weakened', createCodeReviewWeakenedTests],
      ];
      for (const [name, helper] of cases) {
        const missing = join(base, name, 'nested', 'workdir');
        helper(ctx(missing, new FakeRunner()));
        expect(runGit(['rev-parse', 'HEAD'], missing).trim().length).toBe(40);
      }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
