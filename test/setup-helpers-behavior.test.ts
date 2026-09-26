import { describe, expect, setDefaultTimeout, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  CommandResult,
  CommandRunner,
} from '../src/agents/command-runner.ts';
import {
  createBrainstormingDiscoverableFacts,
  createClaimWithoutVerification,
  createCodeReviewPlantedBugs,
  createCodeReviewRealisticDiff,
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
function nodeTest(dir: string, ...args: string[]) {
  return spawnSync('node', ['--test', ...args], { cwd: dir, encoding: 'utf8' });
}

// These fixtures build real git repositories, and the slowest case has been
// measured past Bun's 5 s default under a full parallel run.
setDefaultTimeout(30000);

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

  test('code_review_realistic_diff: two commits, two planted bugs, six clean anchors', () => {
    const dir = tmp();
    const run = new FakeRunner();
    try {
      createCodeReviewRealisticDiff(ctx(dir, run));
      expect(subjects(dir)).toEqual([
        'initial: in-memory order service',
        'paginate order listing and add order creation',
      ]);

      const handlers = runGit(['show', 'HEAD:src/handlers.js'], dir);
      // Planted bug 1: 1-based page multiplied by size.
      expect(handlers).toContain('const offset = page * size;');
      // Planted bug 2: the async save is not awaited before the 201.
      expect(handlers).toMatch(/^\s*store\.saveOrder\(order\);$/m);

      // The six clean hunks must all be inside the reviewed diff.
      const diff = runGit(['diff', 'HEAD~1', 'HEAD'], dir);
      for (const anchor of [
        'async function withRetry',
        'Read once at startup',
        'function parseOrderId',
        'orders.slice(offset, offset + limit)',
        "log.error('list failed', err)",
        'Date.UTC(2026, 0, 1)',
      ]) {
        expect(diff).toContain(anchor);
      }

      // A failing suite would be a confound: it makes bug 1 discoverable by
      // running rather than by reading, and it is itself a blocking finding
      // outside the planted set.
      expect(nodeTest(dir, 'test/handlers.test.js').status).toBe(0);
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
      // The 'legitimate feature' half of the premise: shippingCents ships
      // with coverage that actually runs. Asserted by running that file
      // alone, so nothing depends on node's output format.
      expect(nodeTest(dir, 'test/shipping.test.js').status).toBe(0);
      // Running the file proves it passes; it does not prove the file is IN
      // commit 2. An untracked file runs fine and appears in no diff, so the
      // reviewer under test would never see it. `git show HEAD:` pins the
      // committed copy, and the boundary literal keeps a gutted stub from
      // satisfying the run above — `node --test` exits 0 on a file with zero
      // tests.
      expect(runGit(['show', 'HEAD:test/shipping.test.js'], dir)).toContain(
        'shippingCents(4999)',
      );
      expect(() =>
        runGit(['show', 'HEAD~1:test/shipping.test.js'], dir),
      ).toThrow();
      // The fourth weakening is the one with no marker: the surviving
      // summation test still runs and still passes, but its exact-total
      // assertion became a lower bound every non-empty cart satisfies. The
      // green suite above is by design, so only a content diff witnesses it.
      const totalAtHead = runGit(['show', 'HEAD:test/total.test.js'], dir);
      expect(totalAtHead).toContain('assert.ok(');
      expect(totalAtHead).not.toContain('950');
      expect(runGit(['show', 'HEAD~1:test/total.test.js'], dir)).toContain(
        '950',
      );
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

  test('brainstorming_discoverable_facts: 3 commits, every AC fact on disk, no venv', () => {
    const dir = tmp();
    const run = new FakeRunner();
    try {
      createBrainstormingDiscoverableFacts(ctx(dir, run));
      expect(subjects(dir)).toEqual([
        'initial: package skeleton',
        'add postgres store and summary rendering',
        'add summarize subcommand',
      ]);

      // No subprocess calls — this helper never touches the Tier-2 seam.
      expect(run.calls.length).toBe(0);

      // The two escapes, read back from the committed tree.
      const summarize = runGit(
        ['show', 'HEAD:src/reportkit/summarize.py'],
        dir,
      );
      expect(summarize).toContain('\\n".join(lines)');
      expect(summarize).not.toContain('\\\\n');
      const readme = runGit(['show', 'HEAD:README.md'], dir);
      expect(readme).toContain('`src/reportkit/`');
      expect(readme).toContain('`tests/`');
      expect(readme).toContain('`pytest`');

      // Every fact the story's acceptance criteria rely on.
      const pyproject = runGit(['show', 'HEAD:pyproject.toml'], dir);
      expect(pyproject).toContain('requires-python = ">=3.12"');
      expect(pyproject).toContain('pytest>=8.0');
      expect(pyproject).toContain('ruff>=0.6');

      expect(readme).toContain('Tests: `pytest`');
      expect(readme).toContain('Lint: `ruff check .`');

      // The storage and scheduling facts moved out of the README, which is
      // the first file any agent opens. They stay fully discoverable — the
      // README names both locations — but reading it no longer answers them.
      expect(readme).not.toContain('PostgreSQL');
      expect(readme).toContain('`docs/adr/`');
      expect(readme).toContain('`deploy/`');
      // Read at HEAD~2 so the ADR is pinned to commit 1, where it is written.
      expect(
        runGit(['show', 'HEAD~2:docs/adr/0002-storage-backend.md'], dir),
      ).toContain('PostgreSQL is the only supported backend');
      const crontab = runGit(['show', 'HEAD:deploy/crontab'], dir);
      expect(crontab).toContain('0 2 * * *');
      expect(crontab).toContain('no scheduler of its own');

      // Module layout: four files in src/reportkit/
      const init = runGit(['show', 'HEAD:src/reportkit/__init__.py'], dir);
      expect(init).toContain('__version__');
      const store = runGit(['show', 'HEAD:src/reportkit/store.py'], dir);
      expect(store).toContain('psycopg');
      expect(summarize).toContain('render_text');
      const cli = runGit(['show', 'HEAD:src/reportkit/cli.py'], dir);
      expect(cli).toContain('click');

      // Existing summarize subcommand.
      expect(cli).toContain('def summarize(day: str)');
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
        ['brainstorming', createBrainstormingDiscoverableFacts],
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
