import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChildResult } from '../src/contracts/batch.ts';
import type { InvokeFn } from '../src/run-all/index.ts';
import { runBatch } from '../src/run-all/index.ts';

function fixture(names: readonly string[]): {
  scenariosRoot: string;
  codingAgentsDir: string;
  outRoot: string;
} {
  const root = mkdtempSync(join(tmpdir(), 'runall-hb-'));
  const scenariosRoot = join(root, 'scenarios');
  const codingAgentsDir = join(root, 'coding-agents');
  const outRoot = join(root, 'results');
  mkdirSync(scenariosRoot, { recursive: true });
  mkdirSync(codingAgentsDir, { recursive: true });
  mkdirSync(outRoot, { recursive: true });
  for (const name of names) {
    const dir = join(scenariosRoot, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'story.md'), 'body\n');
    writeFileSync(join(dir, 'checks.sh'), 'pre() { :; }\npost() { :; }\n');
  }
  writeFileSync(join(codingAgentsDir, 'claude.yaml'), 'name: claude\n');
  return { scenariosRoot, codingAgentsDir, outRoot };
}

class StringStream {
  text = '';
  write(s: string): void {
    this.text += s;
  }
}

test('runBatch emits a heartbeat line via the injected timer and stops it at the end', async () => {
  const { scenariosRoot, codingAgentsDir, outRoot } = fixture(['a', 'b']);

  let tick!: () => void;
  let stoppedHeartbeat = 0;
  const startHeartbeat = (t: () => void): (() => void) => {
    tick = t;
    return () => {
      stoppedHeartbeat += 1;
    };
  };

  // jobs:1 -> 'a' is in flight (held open), 'b' is queued, when the tick fires.
  let started = 0;
  let release!: (r: ChildResult) => void;
  const invoke: InvokeFn = (args) =>
    new Promise<ChildResult>((resolve) => {
      started += 1;
      args.onPid?.(started);
      if (started === 1) {
        release = resolve;
      } else {
        resolve({ run_id: null, exit_code: 0, error: null });
      }
    });

  const stream = new StringStream();
  const run = runBatch({
    scenariosRoot,
    codingAgentsDir,
    outRoot,
    jobs: 1,
    invoke,
    startHeartbeat,
    heartbeatSeconds: 30,
    installSignals: () => () => {},
    stream,
  });

  while (started < 1) {
    await new Promise((r) => setTimeout(r, 1));
  }
  tick();
  expect(stream.text).toMatch(/running 1\/1 · done 0 · queued 1/);

  release({ run_id: null, exit_code: 0, error: null });
  await run;
  expect(stoppedHeartbeat).toBe(1);
});
