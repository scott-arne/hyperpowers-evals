import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli } from './cli-run-helpers.ts';

// The production path, end to end under the mock gauntlet: a real `quorum run`
// must leave the record at <out>/<run> and every byte the Coding-Agent can
// write at <out>/workspaces/<run>, with the launcher it generates naming the
// relocated cwd and home.

test('quorum run writes the record under <out>/<run> and the workspace under <out>/workspaces/<run>', () => {
  const { status, stdout, outRoot } = runCli('pass');
  expect(status).toBe(0);
  const runId = /^run-id: (\S+)$/m.exec(stdout)?.[1] as string;
  const runDir = join(outRoot, runId);
  const ws = join(outRoot, 'workspaces', runId);
  expect(existsSync(join(runDir, 'verdict.json'))).toBe(true);
  expect(existsSync(join(runDir, 'coding-agent-workdir'))).toBe(false);
  expect(existsSync(join(runDir, 'home'))).toBe(false);
  expect(existsSync(join(ws, 'coding-agent-workdir'))).toBe(true);
  expect(existsSync(join(ws, 'home'))).toBe(true);
  expect(
    JSON.parse(readFileSync(join(ws, 'package.json'), 'utf8')).private,
  ).toBe(true);
  // The generated launcher names the relocated cwd and home.
  const launcher = readFileSync(
    join(runDir, 'gauntlet-agent', 'context', 'launch-agent'),
    'utf8',
  );
  expect(launcher).toContain(join(ws, 'coding-agent-workdir'));
  expect(launcher).toContain(`HOME='${join(ws, 'home')}'`);
  // A full CLI run under the mock gauntlet; 60 s so a loaded host does not read
  // as a failure (the budget cli-run-sigint.test.ts uses for the same reason).
}, 60_000);
