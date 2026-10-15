import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import type { RunHome } from '../src/agents/index.ts';

// Create an isolated RunHome under the OS temp dir for adapter provisioning
// tests. configDir is NOT pre-created (the adapter creates it); workdir is the
// run root. Returns the home plus a cleanup() that removes the temp tree.
export function makeTempHome(overrides?: Partial<RunHome>): {
  home: RunHome;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), 'quorum-provision-'));
  const record = join(root, 'record');
  mkdirSync(record, { recursive: true });
  const home: RunHome = {
    configDir: join(root, 'coding-agent-config'),
    workdir: join(root, 'coding-agent-workdir'),
    runDir: record,
    skeletonRoot: undefined,
    ...overrides,
  };
  // The spec's two invariants for the shared fixture: the record directory is
  // real, and it is never a workspace path (an override could make it one).
  const refuse = (why: string): never => {
    rmSync(root, { recursive: true, force: true }); // never leak the fixture root on refusal
    throw new Error(`makeTempHome: ${why}`);
  };
  for (const ws of [home.workdir, home.configDir]) {
    if (home.runDir === ws || home.runDir.startsWith(ws + sep)) {
      refuse(`runDir ${home.runDir} lies inside workspace path ${ws}`);
    }
  }
  if (!existsSync(home.runDir)) {
    refuse(`runDir ${home.runDir} does not exist`);
  }
  return {
    home,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true });
    },
  };
}
