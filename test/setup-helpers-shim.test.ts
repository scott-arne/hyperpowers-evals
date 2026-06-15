// test/setup-helpers-shim.test.ts
import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runGit } from '../src/setup-helpers/git.ts';
import { runSetup } from '../src/setup-step.ts';

const REPO = resolve(import.meta.dir, '..');
const PRELUDE = resolve(REPO, 'src', 'checks', 'prelude.sh');

describe('setup-helpers prelude function via runSetup', () => {
  test('bare `setup-helpers` resolves to the TS impl', () => {
    const scenarioDir = mkdtempSync(join(tmpdir(), 'sh-scn-'));
    const workdir = mkdtempSync(join(tmpdir(), 'sh-work-'));
    try {
      writeFileSync(
        join(scenarioDir, 'setup.sh'),
        '#!/usr/bin/env bash\nset -euo pipefail\nsetup-helpers run create_cost_clean_repo\n',
      );
      chmodSync(join(scenarioDir, 'setup.sh'), 0o755);
      runSetup(scenarioDir, workdir, { QUORUM_REPO_ROOT: REPO });
      expect(runGit(['log', '--format=%s'], workdir).trim()).toBe(
        'initial: README',
      );
    } finally {
      rmSync(scenarioDir, { recursive: true, force: true });
      rmSync(workdir, { recursive: true, force: true });
    }
  });

  test('prelude function propagates CLI exit codes (2 usage, 1 error)', () => {
    const workdir = mkdtempSync(join(tmpdir(), 'sh-ec-'));
    try {
      const env = {
        ...process.env,
        QUORUM_WORKDIR: workdir,
        QUORUM_REPO_ROOT: REPO,
      };
      const viaPrelude = (cmd: string) =>
        spawnSync('bash', ['-c', `source '${PRELUDE}'; ${cmd}`], {
          env,
          encoding: 'utf8',
        }).status;
      // Usage error: missing `run` subcommand -> exit 2.
      expect(viaPrelude('setup-helpers')).toBe(2);
      // Unknown helper -> exit 1.
      expect(viaPrelude('setup-helpers run nope')).toBe(1);
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });
});
