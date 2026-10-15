import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Drive the real `quorum run` CLI under the mock gauntlet. Shared by every
// suite that needs a complete run: cli-run.test.ts (output and --repeat) and
// cli-run-layout.test.ts (where the run writes its bytes).

const CLI = resolve(import.meta.dir, '..', 'src', 'cli', 'index.ts');
const MOCK = resolve(import.meta.dir, 'mock-gauntlet');
// The REAL coding-agents/ dir: the runner now requires claude-context/ +
// claude.project-prompt.md for a claude run, and both live here (a synthetic
// fixture would lack them). Its session_log_dir is the same
// ${CLAUDE_CONFIG_DIR}/projects the mock-gauntlet seeds.
const REAL_CODING_AGENTS = resolve(import.meta.dir, '..', 'coding-agents');

export function scenario(): string {
  const scn = mkdtempSync(join(tmpdir(), 'scn-'));
  writeFileSync(
    join(scn, 'story.md'),
    '---\nquorum_max_time: 1m\n---\nDo the thing.',
  );
  writeFileSync(join(scn, 'setup.sh'), '#!/usr/bin/env bash\n:\n');
  chmodSync(join(scn, 'setup.sh'), 0o755);
  writeFileSync(join(scn, 'checks.sh'), 'pre() { :; }\npost() { :; }\n');
  return scn;
}

export interface CliOptions {
  readonly env?: Readonly<Record<string, string>>;
  // Route the CLI's stdout through `cat` instead of straight into spawnSync.
  // spawnSync drains its end of the pipe eagerly, which keeps the pipe empty
  // and hides a flush bug; a copying reader lets the pipe fill and pushes the
  // CLI's later writes into its own userspace buffer.
  readonly pipe?: boolean;
}

export function runCli(
  fixture: string,
  extraArgs: readonly string[] = [],
  opts: CliOptions = {},
): {
  status: number | null;
  stdout: string;
  stderr: string;
  outRoot: string;
} {
  // Hoisted so a caller can read the run dirs the CLI wrote under it.
  const outRoot = mkdtempSync(join(tmpdir(), 'out-'));
  const argv = [
    CLI,
    'run',
    scenario(),
    '--coding-agent',
    'claude',
    '--coding-agents-dir',
    REAL_CODING_AGENTS,
    '--out-root',
    outRoot,
    ...extraArgs,
  ];
  // pipefail keeps the observed status the CLI's own rather than cat's.
  const command = opts.pipe ? 'bash' : 'bun';
  const args = opts.pipe
    ? ['-c', 'set -o pipefail; "$@" | cat', 'quorum', 'bun', ...argv]
    : argv;
  const proc = spawnSync(command, args, {
    env: {
      ...process.env,
      PATH: `${MOCK}:${process.env['PATH'] ?? ''}`,
      ANTHROPIC_API_KEY: 'sk-test',
      // The real claude.yaml lists SUPERPOWERS_ROOT in required_env and the
      // $SUPERPOWERS_ROOT context substitution reads it.
      SUPERPOWERS_ROOT: mkdtempSync(join(tmpdir(), 'sproot-')),
      MOCK_GAUNTLET_FIXTURE: fixture,
      ...opts.env,
    },
    encoding: 'utf8',
  });
  return {
    status: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    outRoot,
  };
}
