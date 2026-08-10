import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { seedCodexPluginCc } from './codex-seed.ts';
import type { HelperContext } from './context.ts';

function mkContext(workdir: string): HelperContext {
  // The helper needs workdir and its sibling home to exist
  const home = join(dirname(workdir), 'home');
  mkdirSync(workdir, { recursive: true });
  mkdirSync(home, { recursive: true });
  return { workdir } as HelperContext;
}

describe('seedCodexPluginCc smoke test', () => {
  test('seeded stub executes: setup --json exits 0 and reports ready', () => {
    const parent = mkdtempSync(join(tmpdir(), 'codex-seed-'));
    const workdir = join(parent, 'wd');
    const ctx = mkContext(workdir);
    try {
      seedCodexPluginCc(ctx);

      const home = join(dirname(workdir), 'home');
      const registry = join(home, '.claude/plugins/installed_plugins.json');
      expect(existsSync(registry)).toBe(true);

      const registryData = JSON.parse(readFileSync(registry, 'utf8'));
      const installPath =
        registryData.plugins['codex@openai-codex'][0].installPath;
      const companion = join(installPath, 'scripts', 'codex-companion.mjs');
      expect(existsSync(companion)).toBe(true);

      // Plain mode: setup --json exits 0 and reports ready
      const setupResult = spawnSync('node', [companion, 'setup', '--json'], {
        encoding: 'utf8',
      });
      expect(setupResult.status).toBe(0);
      const setupOut = JSON.parse(setupResult.stdout);
      expect(setupOut.ready).toBe(true);

      // adversarial-review --json returns the canned review (plain mode: no job protocol)
      const reviewResult = spawnSync(
        'node',
        [companion, 'adversarial-review', '--json'],
        { encoding: 'utf8' },
      );
      expect(reviewResult.status).toBe(0);
      const reviewOut = JSON.parse(reviewResult.stdout);
      expect(reviewOut.verdict).toBe('needs-attention');
      expect(reviewOut.findings).toBeInstanceOf(Array);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  test('job-protocol mode: launch registers, status lists, wait reaches completed, result parses', () => {
    const parent = mkdtempSync(join(tmpdir(), 'codex-seed-job-'));
    const workdir = join(parent, 'wd');
    const ctx = mkContext(workdir);
    try {
      seedCodexPluginCc(ctx);

      const home = join(dirname(workdir), 'home');
      const registry = join(home, '.claude/plugins/installed_plugins.json');
      const registryData = JSON.parse(readFileSync(registry, 'utf8'));
      const installPath =
        registryData.plugins['codex@openai-codex'][0].installPath;
      const companion = join(installPath, 'scripts', 'codex-companion.mjs');

      // Enable job protocol via marker file
      writeFileSync(join(home, '.codex-stub-job-protocol'), '', 'utf8');

      // Launch a review: adversarial-review registers a job and exits
      const launchResult = spawnSync(
        'node',
        [companion, 'adversarial-review', '--json', 'dummy-arg'],
        { encoding: 'utf8', env: { ...process.env, HOME: home } },
      );
      expect(launchResult.status).toBe(0);

      // status --json lists running/finished jobs
      const statusResult = spawnSync('node', [companion, 'status', '--json'], {
        encoding: 'utf8',
        env: { ...process.env, HOME: home },
      });
      expect(statusResult.status).toBe(0);
      const statusOut = JSON.parse(statusResult.stdout);
      expect(statusOut.running).toBeInstanceOf(Array);
      expect(statusOut.running.length).toBeGreaterThan(0);
      const jobId = statusOut.running[0].id;
      expect(typeof jobId).toBe('string');

      // Poll job until completed (stub advances queued->running->completed across polls)
      let completed = false;
      for (let i = 0; i < 5; i++) {
        const waitResult = spawnSync(
          'node',
          [companion, 'status', jobId, '--wait', '--json'],
          { encoding: 'utf8', env: { ...process.env, HOME: home } },
        );
        expect(waitResult.status).toBe(0);
        const waitOut = JSON.parse(waitResult.stdout);
        if (waitOut.job.status === 'completed') {
          completed = true;
          break;
        }
      }
      expect(completed).toBe(true);

      // result <id> --json returns the canned approval payload
      const resultResult = spawnSync(
        'node',
        [companion, 'result', jobId, '--json'],
        { encoding: 'utf8', env: { ...process.env, HOME: home } },
      );
      expect(resultResult.status).toBe(0);
      const resultOut = JSON.parse(resultResult.stdout);
      expect(resultOut.storedJob?.result?.result?.verdict).toBe('approve');
      expect(typeof resultOut.storedJob?.result?.rawOutput).toBe('string');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  test('state isolation: two different homes never see each other jobs', () => {
    const parent = mkdtempSync(join(tmpdir(), 'codex-seed-isolation-'));
    const parent1 = join(parent, 'env1');
    const parent2 = join(parent, 'env2');
    const workdir1 = join(parent1, 'wd');
    const workdir2 = join(parent2, 'wd');
    const ctx1 = mkContext(workdir1);
    const ctx2 = mkContext(workdir2);
    try {
      seedCodexPluginCc(ctx1);
      seedCodexPluginCc(ctx2);

      const home1 = join(dirname(workdir1), 'home');
      const home2 = join(dirname(workdir2), 'home');

      const registry1 = join(home1, '.claude/plugins/installed_plugins.json');
      const registry2 = join(home2, '.claude/plugins/installed_plugins.json');
      const registryData1 = JSON.parse(readFileSync(registry1, 'utf8'));
      const registryData2 = JSON.parse(readFileSync(registry2, 'utf8'));
      const companion1 = join(
        registryData1.plugins['codex@openai-codex'][0].installPath,
        'scripts',
        'codex-companion.mjs',
      );
      const companion2 = join(
        registryData2.plugins['codex@openai-codex'][0].installPath,
        'scripts',
        'codex-companion.mjs',
      );

      // Enable job protocol in both homes
      writeFileSync(join(home1, '.codex-stub-job-protocol'), '', 'utf8');
      writeFileSync(join(home2, '.codex-stub-job-protocol'), '', 'utf8');

      // Launch a job in home1
      const launch1 = spawnSync(
        'node',
        [companion1, 'adversarial-review', '--json', 'arg1'],
        {
          encoding: 'utf8',
          env: { HOME: home1, PATH: process.env.PATH || '' },
        },
      );
      expect(launch1.status).toBe(0);

      // Launch a job in home2
      const launch2 = spawnSync(
        'node',
        [companion2, 'adversarial-review', '--json', 'arg2'],
        {
          encoding: 'utf8',
          env: { HOME: home2, PATH: process.env.PATH || '' },
        },
      );
      expect(launch2.status).toBe(0);

      // status --json in home1 should only see home1's job
      const status1 = spawnSync('node', [companion1, 'status', '--json'], {
        encoding: 'utf8',
        env: { HOME: home1, PATH: process.env.PATH || '' },
      });
      expect(status1.status).toBe(0);
      const status1Out = JSON.parse(status1.stdout);
      expect(status1Out.running.length).toBe(1);

      // status --json in home2 should only see home2's job
      const status2 = spawnSync('node', [companion2, 'status', '--json'], {
        encoding: 'utf8',
        env: { HOME: home2, PATH: process.env.PATH || '' },
      });
      expect(status2.status).toBe(0);
      const status2Out = JSON.parse(status2.stdout);
      expect(status2Out.running.length).toBe(1);

      // The job IDs must be different
      const job1Id = status1Out.running[0].id;
      const job2Id = status2Out.running[0].id;
      expect(job1Id).not.toBe(job2Id);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
