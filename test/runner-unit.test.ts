import { expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { nowStampUtc } from '../src/paths.ts';
import {
  allocateRunDir,
  allocateRunDirWithNonce,
  buildGauntletArgv,
} from '../src/runner/index.ts';

// Occupy `<scenario>-<agent>-<stamp>-<nonce>` under every stamp the allocator
// could plausibly read. The stamp resolves to the second and the allocator
// reads its own clock, so pinning only the current second would let a run that
// straddles a tick miss the collision and pass without exercising the retry.
function occupy(
  outRoot: string,
  scenario: string,
  agent: string,
  nonce: string,
): readonly string[] {
  const now = new Date();
  return [now, new Date(now.getTime() + 1000)].map((at) => {
    const dir = join(
      outRoot,
      `${scenario}-${agent}-${nowStampUtc(at)}-${nonce}`,
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'verdict.json'), 'first');
    return dir;
  });
}

test('allocateRunDir names <scenario>-<agent>-<stamp>-<nonce> and creates it', () => {
  const out = mkdtempSync(join(tmpdir(), 'out-'));
  const dir = allocateRunDir(out, '00-quorum-smoke-hello-world', 'claude');
  expect(basename(dir)).toMatch(
    /^00-quorum-smoke-hello-world-claude-\d{8}T\d{6}Z-[0-9a-f]{4}$/,
  );
  expect(existsSync(dir)).toBe(true);
});

test('allocateRunDir is unique across calls (distinct nonces)', () => {
  const out = mkdtempSync(join(tmpdir(), 'out-'));
  const a = allocateRunDir(out, 'scn', 'codex');
  const b = allocateRunDir(out, 'scn', 'codex');
  expect(a).not.toBe(b);
});

test('allocateRunDir creates outRoot when it does not exist yet', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'out-')), 'nested', 'results');
  const dir = allocateRunDir(out, 'scn', 'claude');
  expect(existsSync(dir)).toBe(true);
});

test('allocateRunDir redraws the nonce rather than reusing an occupied dir', () => {
  const out = mkdtempSync(join(tmpdir(), 'out-'));
  const taken = occupy(out, 'scn', 'claude', 'aaaa');

  const draws = ['aaaa', 'bbbb'];
  let drawn = 0;
  const dir = allocateRunDirWithNonce(out, 'scn', 'claude', () => {
    const nonce = draws[drawn] ?? 'cccc';
    drawn += 1;
    return nonce;
  });

  // The retry actually ran: the first draw collided and a second was pulled.
  expect(drawn).toBe(2);
  expect(basename(dir)).toMatch(/-bbbb$/);
  expect(taken).not.toContain(dir);
  // And the run already holding that name kept its verdict.
  for (const occupied of taken) {
    expect(readFileSync(join(occupied, 'verdict.json'), 'utf8')).toBe('first');
  }
});

test('allocateRunDir throws once the nonce redraws are exhausted', () => {
  const out = mkdtempSync(join(tmpdir(), 'out-'));
  occupy(out, 'scn', 'claude', 'dead');
  // A nonce source that never varies: every attempt hits the same taken name,
  // so the bound is the only thing that can end the loop.
  expect(() =>
    allocateRunDirWithNonce(out, 'scn', 'claude', () => 'dead'),
  ).toThrow(/could not allocate a run dir/);
});

test('buildGauntletArgv is exact and order-stable with all optional flags', () => {
  const argv = buildGauntletArgv({
    storyPath: '/s/story.md',
    targetBinary: 'claude',
    runDir: '/r',
    maxTime: '10m',
    projectPrompt: '/r/p.md',
  });
  expect(argv).toEqual([
    'run',
    '/s/story.md',
    '--adapter',
    'tui',
    '--target',
    'claude',
    '--project-dir',
    '/r',
    '--state-dir',
    'gauntlet-agent',
    '--silent',
    '--max-time',
    '10m',
    '--project-prompt',
    '/r/p.md',
  ]);
});

test('buildGauntletArgv omits optional flags when absent', () => {
  const argv = buildGauntletArgv({
    storyPath: '/s/story.md',
    targetBinary: 'codex',
    runDir: '/r',
  });
  expect(argv).toEqual([
    'run',
    '/s/story.md',
    '--adapter',
    'tui',
    '--target',
    'codex',
    '--project-dir',
    '/r',
    '--state-dir',
    'gauntlet-agent',
    '--silent',
  ]);
});

test('buildGauntletArgv appends only --max-time when projectPrompt is absent', () => {
  const argv = buildGauntletArgv({
    storyPath: '/s/story.md',
    targetBinary: 'claude',
    runDir: '/r',
    maxTime: '5m',
  });
  expect(argv).toEqual([
    'run',
    '/s/story.md',
    '--adapter',
    'tui',
    '--target',
    'claude',
    '--project-dir',
    '/r',
    '--state-dir',
    'gauntlet-agent',
    '--silent',
    '--max-time',
    '5m',
  ]);
});
