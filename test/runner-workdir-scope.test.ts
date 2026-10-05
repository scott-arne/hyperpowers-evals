import { afterAll, describe, expect, test } from 'bun:test';
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
import { join } from 'node:path';
import { isolateWorkdirPackageScope } from '../src/runner/index.ts';

// A run's fixture lives at <runDir>/coding-agent-workdir under evals/results/,
// so a fixture with no package.json of its own inherits evals' own: Node takes
// the module type from the nearest package.json walking upward, and npm picks
// its project root the same way. The runner ends that walk at the run
// directory so the fixture behaves like a repository on its own.

const root = mkdtempSync(join(tmpdir(), 'workdir-scope-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

// Stands in for evals/package.json two levels above a run directory, with one
// CommonJS and one ESM entry point in the fixture; each exits 0 only when its
// import resolved.
function makeRun(name: string): { runDir: string; workdir: string } {
  writeFileSync(join(root, 'package.json'), '{ "type": "module" }\n');
  const runDir = join(root, 'results', name);
  const workdir = join(runDir, 'coding-agent-workdir');
  mkdirSync(workdir, { recursive: true });
  writeFileSync(join(workdir, 'lib.js'), 'module.exports = { n: 1 };\n');
  writeFileSync(
    join(workdir, 'cjs.js'),
    'const l = require("./lib.js");\nprocess.exit(l.n === 1 ? 0 : 3);\n',
  );
  writeFileSync(join(workdir, 'esm-lib.js'), 'export const n = 2;\n');
  writeFileSync(
    join(workdir, 'esm.js'),
    'import { n } from "./esm-lib.js";\nprocess.exit(n === 2 ? 0 : 3);\n',
  );
  return { runDir, workdir };
}

function nodeExit(workdir: string, file: string): number {
  const r = spawnSync('node', [file], { cwd: workdir, encoding: 'utf8' });
  return r.status ?? -1;
}

describe('isolateWorkdirPackageScope', () => {
  test('the condition being fixed: a CommonJS fixture file inherits the parent "type": "module" and fails', () => {
    const { workdir } = makeRun('inherits');
    expect(nodeExit(workdir, 'cjs.js')).not.toBe(0);
    expect(nodeExit(workdir, 'esm.js')).toBe(0);
  });

  test('after it, CommonJS and ESM fixture files both run', () => {
    const { runDir, workdir } = makeRun('isolated');
    isolateWorkdirPackageScope(runDir);
    expect(nodeExit(workdir, 'cjs.js')).toBe(0);
    expect(nodeExit(workdir, 'esm.js')).toBe(0);
  });

  test('writes a type-less private package.json at the run dir and nothing in the fixture', () => {
    const { runDir, workdir } = makeRun('shape');
    isolateWorkdirPackageScope(runDir);
    const pkg = JSON.parse(readFileSync(join(runDir, 'package.json'), 'utf8'));
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBeUndefined();
    expect(existsSync(join(workdir, 'package.json'))).toBe(false);
  });
});
