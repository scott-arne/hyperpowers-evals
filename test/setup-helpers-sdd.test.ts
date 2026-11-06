// test/setup-helpers-sdd.test.ts
import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGit } from '../src/setup-helpers/git.ts';
import {
  addSddAuthPlan,
  scaffoldSddBrokenPlan,
  scaffoldSddGoFractalsGpt55,
  scaffoldSddQualityDefectPlan,
  scaffoldSddSpecConstraintPlan,
  scaffoldSddTurnLiveness,
  scaffoldSddYagniPlan,
} from '../src/setup-helpers/sdd-fixtures.ts';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'sh-sdd-'));
}

describe('sdd fixtures', () => {
  test('scaffoldSddGoFractalsGpt55 reads fixtures/ and commits design+plan', () => {
    const dir = tmp();
    try {
      scaffoldSddGoFractalsGpt55({ workdir: dir } as never);
      expect(runGit(['log', '--format=%s'], dir).trim()).toBe(
        'initial: design + plan',
      );
      expect(runGit(['show', 'HEAD:design.md'], dir).length).toBeGreaterThan(0);
      expect(runGit(['show', 'HEAD:plan.md'], dir).length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('scaffoldSddTurnLiveness copies the tree and commits it', () => {
    const dir = tmp();
    try {
      scaffoldSddTurnLiveness({ workdir: dir } as never);
      expect(runGit(['log', '--format=%s'], dir).trim()).toBe(
        'initial: design, plan and soak tests',
      );
      for (const f of [
        'design.md',
        'plan.md',
        'tests/__init__.py',
        'tests/test_soak_short.py',
        'tests/test_soak_long.py',
      ]) {
        expect(runGit(['ls-files', '--error-unmatch', f], dir).trim()).toBe(f);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the turn-liveness fixture plan has six tasks, names both slow covering commands, and says nothing about how to wait', () => {
    const plan = readFileSync(
      join(import.meta.dir, '..', 'fixtures', 'sdd-turn-liveness', 'plan.md'),
      'utf8',
    );
    const headings = [...plan.matchAll(/^### Task (\d+)\b/gm)].map((m) =>
      Number(m[1]),
    );
    expect(headings).toEqual([1, 2, 3, 4, 5, 6]);
    const sections = plan.split(/^### Task \d+\b/m).slice(1);
    const short = 'python3 -m unittest tests.test_soak_short -v';
    const long = 'python3 -m unittest tests.test_soak_long -v';
    expect(
      sections.some((s) => s.includes(short) && /(four|4)\s*min/i.test(s)),
    ).toBe(true);
    expect(
      sections.some((s) => s.includes(long) && /(twelve|12)\s*min/i.test(s)),
    ).toBe(true);
    // Deviation 5: the stimulus must not tell the executor how to run or wait.
    expect(plan).not.toMatch(
      /run_in_background|in the background|foreground|completion notification/i,
    );
    // The deliberate conflict (stop-guard spec, Design §4): Task 1 and Task 5 give DEFAULT_WINDOW_SECONDS two values.
    expect(sections[0]).toContain(
      '`DEFAULT_WINDOW_SECONDS = 1.0` in `ratelimit/__init__.py`',
    );
    expect(sections[4]).toContain(
      '`--window` is optional and defaults to `DEFAULT_WINDOW_SECONDS` from Task 1, which is 1.5 seconds.',
    );
    // The executable snippets agree with themselves: the constant is defined and the CLI default names it.
    expect(sections[0]).toContain('\nDEFAULT_WINDOW_SECONDS = 1.0\n```');
    expect(sections[4]).toContain('default=DEFAULT_WINDOW_SECONDS');
  });

  test('scaffoldSddBrokenPlan keeps the literal backslash-n in the plan', () => {
    const dir = tmp();
    try {
      scaffoldSddBrokenPlan({ workdir: dir } as never);
      const plan = runGit(
        ['show', 'HEAD:docs/superpowers/plans/report-plan.md'],
        dir,
      );
      // The plan embeds `lines.join("\n")` as LITERAL backslash-n, not a newline.
      expect(plan).toContain('lines.join("\\n")');
      expect(runGit(['log', '--format=%s'], dir).trim()).toBe(
        'initial: report formatter plan',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('scaffoldSddYagniPlan uses math-plan.md + its own commit message', () => {
    const dir = tmp();
    try {
      scaffoldSddYagniPlan({ workdir: dir } as never);
      expect(runGit(['log', '--format=%s'], dir).trim()).toBe(
        'initial: math YAGNI plan',
      );
      expect(
        runGit(['show', 'HEAD:docs/superpowers/plans/math-plan.md'], dir),
      ).toContain('DO NOT');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('scaffoldSddQualityDefectPlan: report-quality pkg + literal backslash-n', () => {
    const dir = tmp();
    try {
      scaffoldSddQualityDefectPlan({ workdir: dir } as never);
      expect(runGit(['log', '--format=%s'], dir).trim()).toBe(
        'initial: report formatter plan',
      );
      expect(runGit(['show', 'HEAD:package.json'], dir)).toContain(
        '"report-quality"',
      );
      const plan = runGit(
        ['show', 'HEAD:docs/superpowers/plans/report-plan.md'],
        dir,
      );
      expect(plan).toContain('lines.join("\\n")'); // literal backslash-n, not a newline
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Mirrors tests/test_sdd_neutral_setup_helper.py: the plan cites the spec by
  // path (the "quartz" marker lives only in the spec), and the repo lands on a
  // clean `main` with no implementation present.
  test('scaffoldSddSpecConstraintPlan: plan cites spec, quartz only in spec, clean main', () => {
    const dir = tmp();
    try {
      scaffoldSddSpecConstraintPlan({ workdir: dir } as never);

      const specRel = 'docs/superpowers/specs/2026-06-12-priority-design.md';
      const planRel = 'docs/superpowers/plans/2026-06-12-priority.md';
      expect(existsSync(join(dir, specRel))).toBe(true);
      expect(existsSync(join(dir, planRel))).toBe(true);

      const spec = runGit(['show', `HEAD:${specRel}`], dir);
      const plan = runGit(['show', `HEAD:${planRel}`], dir);
      expect(spec).toContain('quartz');
      expect(plan).toContain(specRel);
      expect(plan).not.toContain('quartz');

      expect(runGit(['branch', '--show-current'], dir).trim()).toBe('main');
      expect(runGit(['status', '--short'], dir).trim()).toBe('');
      expect(existsSync(join(dir, 'src', 'priority.js'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Python parity (L-helper-missing-workdir-mkdir): the scratch-building sdd
  // helpers (fixture-reading scaffold + embedded-body) must create
  // $QUORUM_WORKDIR before `git init` when it is absent.
  test('each scratch sdd helper creates the workdir when it does not exist', () => {
    const base = tmp();
    try {
      const cases: Array<[string, (ctx: never) => void]> = [
        ['go-fractals', scaffoldSddGoFractalsGpt55],
        ['broken', scaffoldSddBrokenPlan],
        ['quality', scaffoldSddQualityDefectPlan],
        ['yagni', scaffoldSddYagniPlan],
        ['spec-constraint', scaffoldSddSpecConstraintPlan],
      ];
      for (const [name, helper] of cases) {
        const missing = join(base, name, 'nested', 'workdir');
        helper({ workdir: missing } as never);
        expect(runGit(['rev-parse', 'HEAD'], missing).trim().length).toBe(40);
      }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test('addSddAuthPlan layers onto an existing repo (no init)', () => {
    const dir = tmp();
    try {
      runGit(['init', '-b', 'main'], dir);
      runGit(['config', 'user.email', 'drill@test.local'], dir);
      runGit(['config', 'user.name', 'Drill Test'], dir);
      runGit(['commit', '--allow-empty', '-m', 'base'], dir);
      addSddAuthPlan({ workdir: dir } as never);
      expect(runGit(['log', '-1', '--format=%s'], dir).trim()).toBe(
        'draft auth-system plan',
      );
      expect(
        runGit(['show', 'HEAD:docs/superpowers/plans/auth-system.md'], dir),
      ).toContain('Auth System');
      const plan = runGit(
        ['show', 'HEAD:docs/superpowers/plans/auth-system.md'],
        dir,
      );
      expect(plan).toContain('src/auth/credentials.js');
      expect(plan).toContain('test/auth/credentials.test.js');
      expect(plan).toContain('npm test');
      expect(plan).not.toMatch(/\b(stub|placeholder|no-op)\b/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
