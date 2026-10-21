import { afterAll, expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { scanResults } from '../src/dashboard/scan.ts';
import { allocateWorkspace, buildRunHome } from '../src/runner/index.ts';
import { makeTempHome } from './provision-helpers.ts';

const outRoot = mkdtempSync(join(tmpdir(), 'out-'));
afterAll(() => rmSync(outRoot, { recursive: true, force: true }));

const RUN = 'brainstorming-smoke-claude-auto-20260101T000000Z-abcd';

test('the workspace lives beside the record under workspaces/<run>, with the sentinel at its root', () => {
  const runDir = join(outRoot, RUN);
  mkdirSync(runDir, { recursive: true });
  const ws = allocateWorkspace(outRoot, runDir);
  expect(ws.workspaceDir).toBe(join(outRoot, 'workspaces', basename(runDir)));
  expect(ws.workdir).toBe(join(ws.workspaceDir, 'coding-agent-workdir'));
  expect(ws.runHomeDir).toBe(join(ws.workspaceDir, 'home'));
  expect(existsSync(ws.workdir)).toBe(true);
  expect(existsSync(ws.runHomeDir)).toBe(true);
  const pkg = JSON.parse(
    readFileSync(join(ws.workspaceDir, 'package.json'), 'utf8'),
  );
  expect(pkg.private).toBe(true);
  expect(existsSync(join(runDir, 'package.json'))).toBe(false);
  expect(existsSync(join(ws.workdir, 'package.json'))).toBe(false);
});

test('buildRunHome names the record directory as runDir', () => {
  const home = buildRunHome(
    '/ws/home/.claude',
    '/ws/coding-agent-workdir',
    '/out/run-1',
    undefined,
  );
  expect(home.runDir).toBe('/out/run-1');
  expect(home.workdir).toBe('/ws/coding-agent-workdir');
  expect('claudeEnv' in home).toBe(false);
});

test("buildRunHome carries a scenario's claude-env map", () => {
  const home = buildRunHome(
    '/ws/home/.claude',
    '/ws/coding-agent-workdir',
    '/out/run-1',
    undefined,
    { CLAUDE_CODE_ENABLE_TODO_TOOLS: '1' },
  );
  expect(home.claudeEnv).toEqual({ CLAUDE_CODE_ENABLE_TODO_TOOLS: '1' });
});

test('the dashboard scan ignores the workspaces directory', () => {
  writeFileSync(
    join(outRoot, RUN, 'verdict.json'),
    JSON.stringify({ schema: 1, final: 'pass' }),
  );
  const grid = scanResults(outRoot, ['claude-auto']);
  expect(grid.cells.size).toBe(1);
  for (const key of grid.cells.keys()) expect(key).not.toContain('workspaces');
});

test('makeTempHome refuses a runDir inside a workspace path and a runDir that does not exist', () => {
  // makeTempHome returns { home, cleanup } (test/provision-helpers.ts:9-12). The
  // invariant is per invocation, so the override must place runDir under the
  // SAME invocation's workdir: pass both.
  const ws = mkdtempSync(join(tmpdir(), 'ws-'));
  expect(() => makeTempHome({ workdir: ws, runDir: join(ws, 'x') })).toThrow(
    /inside workspace path/,
  );
  expect(() =>
    makeTempHome({ runDir: join(tmpdir(), 'no-such-record-dir') }),
  ).toThrow(/does not exist/);
  const ok = makeTempHome();
  expect(existsSync(ok.home.runDir)).toBe(true);
  ok.cleanup();
  rmSync(ws, { recursive: true, force: true });
});
