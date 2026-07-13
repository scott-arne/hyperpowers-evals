import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommandRunner } from '../src/agents/command-runner.ts';
import { envSnapshot } from '../src/env.ts';
import { seedCodexPluginCc } from '../src/setup-helpers/codex-seed.ts';

// The helper never shells out, so the runner seam is a no-op fake.
class UnusedRunner implements CommandRunner {
  run() {
    return { status: 0, stdout: '', stderr: '' };
  }
}

// Mirror the runner's layout: <runDir>/coding-agent-workdir is the workdir and
// <runDir>/home is the agent's $HOME (created by the runner before setup.sh).
function makeRun(): { runDir: string; workdir: string; home: string } {
  const runDir = mkdtempSync(join(tmpdir(), 'codex-seed-'));
  const workdir = join(runDir, 'coding-agent-workdir');
  const home = join(runDir, 'home');
  mkdirSync(workdir, { recursive: true });
  mkdirSync(home, { recursive: true });
  return { runDir, workdir, home };
}

function ctx(workdir: string) {
  return {
    workdir,
    templateDir: undefined,
    superpowersRoot: undefined,
    run: new UnusedRunner(),
  };
}

describe('seed_codex_plugin_cc', () => {
  test('writes the registry and a stub companion under the agent home', () => {
    const { runDir, workdir, home } = makeRun();
    try {
      seedCodexPluginCc(ctx(workdir));

      const registryPath = join(home, '.claude/plugins/installed_plugins.json');
      expect(existsSync(registryPath)).toBe(true);

      const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
      const recs = reg.plugins['codex@openai-codex'];
      expect(Array.isArray(recs)).toBe(true);
      const installPath = recs[0].installPath;

      const companion = join(installPath, 'scripts/codex-companion.mjs');
      expect(existsSync(companion)).toBe(true);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  test('stub companion reports ready for `setup --json`', () => {
    const { runDir, workdir, home } = makeRun();
    try {
      seedCodexPluginCc(ctx(workdir));
      const reg = JSON.parse(
        readFileSync(
          join(home, '.claude/plugins/installed_plugins.json'),
          'utf8',
        ),
      );
      const companion = join(
        reg.plugins['codex@openai-codex'][0].installPath,
        'scripts/codex-companion.mjs',
      );
      const out = execFileSync('node', [companion, 'setup', '--json'], {
        encoding: 'utf8',
      });
      expect(JSON.parse(out).ready).toBe(true);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  test('stub companion returns a needs-attention review with findings', () => {
    const { runDir, workdir, home } = makeRun();
    try {
      seedCodexPluginCc(ctx(workdir));
      const reg = JSON.parse(
        readFileSync(
          join(home, '.claude/plugins/installed_plugins.json'),
          'utf8',
        ),
      );
      const companion = join(
        reg.plugins['codex@openai-codex'][0].installPath,
        'scripts/codex-companion.mjs',
      );
      const out = execFileSync(
        'node',
        [companion, 'review', '--base', 'HEAD~1'],
        {
          encoding: 'utf8',
        },
      );
      const review = JSON.parse(out);
      expect(review.verdict).toBe('needs-attention');
      expect(review.findings.length).toBeGreaterThan(0);
      // At least one blocking-severity finding (critical/high) for the gate loop.
      expect(
        review.findings.some(
          (f: { severity: string }) =>
            f.severity === 'high' || f.severity === 'critical',
        ),
      ).toBe(true);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  test('the real codex-available.sh probe resolves to ready against the seed', () => {
    const { runDir, workdir, home } = makeRun();
    const probe = join(
      import.meta.dir,
      '..',
      '..',
      'skills/requesting-code-review/scripts/codex-available.sh',
    );
    // The probe lives in the parent hyperpowers checkout. Only run this end-to-end
    // assertion when that checkout is present (it is when evals/ is nested under
    // hyperpowers); otherwise skip rather than false-fail an isolated eval clone.
    if (!existsSync(probe)) {
      return;
    }
    try {
      seedCodexPluginCc(ctx(workdir));
      // The probe defaults to $HOME/.claude/plugins/installed_plugins.json; point
      // HOME at the seeded agent home.
      const out = execFileSync('bash', [probe], {
        encoding: 'utf8',
        env: { ...envSnapshot(), HOME: home },
      }).trim();
      const reg = JSON.parse(
        readFileSync(
          join(home, '.claude/plugins/installed_plugins.json'),
          'utf8',
        ),
      );
      // The probe prints two lines: the install path, then the installed
      // codex-plugin-cc version — "unknown" here because the seed ships no
      // .claude-plugin/plugin.json manifest.
      const [installPath, version] = out.split('\n');
      expect(installPath).toBe(
        reg.plugins['codex@openai-codex'][0].installPath,
      );
      expect(version).toBe('unknown');
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });
});
