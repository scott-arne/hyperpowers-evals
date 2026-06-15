import { expect, test } from 'bun:test';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  cleanupAgentRuntime,
  RunnerError,
  runtimeCleanupDirs,
} from '../src/runner/index.ts';

// Region 5 — agent-runtime teardown. An agent's provisioning may write secret
// material (kimi's mode-0600 runtime env file) into a mkdtemp dir kept OUTSIDE
// the run artifact root so capture never snapshots it; that dir must be reaped
// on every run-exit path (parity with Python AgentRuntime.cleanup_dirs +
// _cleanup_agent_runtime). runtimeCleanupDirs derives the dirs from the
// provision env map; cleanupAgentRuntime removes them and fails the run if a
// secret path survives.

test('runtimeCleanupDirs: KIMI_ENV_FILE -> its parent temp dir', () => {
  const envFile = '/tmp/quorum-kimi-runtime-abc/kimi-runtime.env';
  expect(runtimeCleanupDirs({ KIMI_ENV_FILE: envFile })).toEqual([
    dirname(envFile),
  ]);
});

test('runtimeCleanupDirs: no KIMI_ENV_FILE -> empty (other agents reap nothing)', () => {
  expect(runtimeCleanupDirs({ CLAUDE_CONFIG_DIR: '/run/cfg' })).toEqual([]);
  expect(runtimeCleanupDirs({})).toEqual([]);
});

test('cleanupAgentRuntime: reaps the secret temp dir (and its env file)', () => {
  const secretDir = mkdtempSync(join(tmpdir(), 'quorum-kimi-runtime-'));
  const envFile = join(secretDir, 'kimi-runtime.env');
  writeFileSync(envFile, "KIMI_MODEL_API_KEY='sk-secret'\n", { mode: 0o600 });
  expect(existsSync(envFile)).toBe(true);

  cleanupAgentRuntime([secretDir]);

  expect(existsSync(envFile)).toBe(false);
  expect(existsSync(secretDir)).toBe(false);
});

test('cleanupAgentRuntime: empty list is a no-op', () => {
  expect(() => cleanupAgentRuntime([])).not.toThrow();
});

test('cleanupAgentRuntime: already-absent dir is ignored (no throw)', () => {
  const gone = join(tmpdir(), 'quorum-kimi-runtime-never-existed-xyz');
  expect(existsSync(gone)).toBe(false);
  expect(() => cleanupAgentRuntime([gone])).not.toThrow();
});

test('cleanupAgentRuntime: a surviving secret path -> RunnerError(setup)', () => {
  // Non-root only: a read+execute-but-not-write parent makes the child dir
  // unremovable, so the secret survives removal and must fail the run.
  if (process.getuid?.() === 0) {
    return;
  }
  const parent = mkdtempSync(join(tmpdir(), 'quorum-kimi-locked-'));
  const child = join(parent, 'runtime');
  mkdirSync(child);
  writeFileSync(join(child, 'kimi-runtime.env'), 'secret', { mode: 0o600 });
  chmodSync(parent, 0o500);
  try {
    expect(() => cleanupAgentRuntime([child])).toThrow(RunnerError);
    expect(() => cleanupAgentRuntime([child])).toThrow(/cleanup failed/);
  } finally {
    chmodSync(parent, 0o700);
    rmSync(parent, { recursive: true, force: true });
  }
});
