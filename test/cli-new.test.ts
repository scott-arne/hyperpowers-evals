import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(import.meta.dir, '..', 'src', 'cli', 'index.ts');

// The PRODUCTION wiring: `quorum new foo/bar` goes through
// newScenario(scenarioDirFor(name, root), name). Python new_scenario stamps the
// story `id:` with the RAW name (`foo/bar`), not the basename (`bar`). A test
// that calls newScenario(dir, name) directly already passes; only the real CLI
// call shape catches a miswired caller that drops the name argument.
test('quorum new stamps the story id from the raw path-like name (not the basename)', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'quorum-new-'));
  const proc = spawnSync('bun', [CLI, 'new', 'foo/bar'], {
    cwd,
    encoding: 'utf8',
  });
  expect(proc.status).toBe(0);
  // Path-like name: scenarioDirFor takes it as given, so the dir is cwd/foo/bar.
  const story = readFileSync(join(cwd, 'foo', 'bar', 'story.md'), 'utf8');
  expect(story).toContain('id: foo/bar');
});
