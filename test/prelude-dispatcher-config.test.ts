import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { getEnv } from '../src/env.ts';

const REPO = resolve(import.meta.dir, '..');
const PRELUDE = resolve(REPO, 'src', 'checks', 'prelude.sh');

// Measured during design on Bun 1.4.2: a plain `bun run <abs script>` from a
// workdir holding a bunfig.toml preload executes the preload and loads the
// workdir .env. Every prelude dispatcher runs with cwd = the agent workdir.
function plantedWorkdir(): { wd: string; mark: string } {
  const wd = mkdtempSync(join(tmpdir(), 'planted-wd-'));
  const mark = join(wd, 'preload-ran');
  writeFileSync(join(wd, 'bunfig.toml'), 'preload = ["./p.ts"]\n');
  writeFileSync(
    join(wd, 'p.ts'),
    `require("node:fs").writeFileSync(${JSON.stringify(mark)}, "ran\\n");\n`,
  );
  writeFileSync(join(wd, '.env'), 'QUORUM_PROBE_DOTENV=leaked\n');
  return { wd, mark };
}

function bashInWorkdir(wd: string, script: string, sink: string) {
  return spawnSync('bash', ['-c', `source '${PRELUDE}'; ${script}`], {
    cwd: wd,
    encoding: 'utf8',
    env: {
      PATH: getEnv('PATH') ?? '/usr/bin:/bin',
      HOME: getEnv('HOME') ?? '/tmp',
      QUORUM_REPO_ROOT: REPO,
      QUORUM_RECORD_SINK: sink,
      QUORUM_INNER_ENV: 'legacy',
    }, // getEnv from '../src/env.ts': this file is not in the noProcessEnv override
  });
}

test('sourcing the prelude from a planted workdir runs no preload', () => {
  const { wd, mark } = plantedWorkdir();
  const sink = join(mkdtempSync(join(tmpdir(), 'sink-')), 'records.jsonl');
  const r = bashInWorkdir(wd, 'true', sink);
  expect(r.status).toBe(0);
  expect(existsSync(mark)).toBe(false);
});

test('a verb run through the prelude from a planted workdir runs no preload and sees no .env', () => {
  const { wd, mark } = plantedWorkdir();
  const sink = join(mkdtempSync(join(tmpdir(), 'sink-')), 'records.jsonl');
  // The dispatcher's own view of the environment: a verb that reads it.
  const r = bashInWorkdir(
    wd,
    'command-succeeds \'test -z "${QUORUM_PROBE_DOTENV:-}"\'',
    sink,
  );
  expect(existsSync(mark)).toBe(false);
  expect(r.status).toBe(0);
  expect(readFileSync(sink, 'utf8')).toContain('"passed":true');
});
