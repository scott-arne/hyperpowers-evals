import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The live phase vocabulary the runner owns. `grade` is intentionally absent
// (build spec: the gauntlet event stream carries no grade-start marker; done is
// signalled by verdict.json appearing, not a phase).
export type RunPhase = 'setup' | 'agent' | 'checks';

// The three filesystem calls writePhase makes, injectable so a test can watch
// the order and fail the rename.
export interface PhaseFs {
  readonly writeFileSync: (path: string, data: string) => void;
  readonly renameSync: (from: string, to: string) => void;
  readonly rmSync: (path: string, options: { force: boolean }) => void;
}

const NODE_FS: PhaseFs = { writeFileSync, renameSync, rmSync };

// Write <runDir>/phase.json at a boundary the runner owns. `pid` is the
// `quorum run` process id; the dashboard uses it for liveness (phase mtime is
// not a liveness signal — a phase can last tens of minutes). The file stops
// updating once verdict.json is written (verdict.json is the done signal).
// The new phase goes to a temporary file that is renamed over phase.json: a
// direct write truncates first, and the dashboard reading that empty or
// partial file took the run for finished. A failed rename leaves the previous
// phase in place and rethrows, as a failed write always did.
export function writePhase(
  runDir: string,
  phase: RunPhase,
  fs: PhaseFs = NODE_FS,
): void {
  const body = {
    phase,
    updated_at: new Date().toISOString(),
    pid: process.pid,
  };
  const target = join(runDir, 'phase.json');
  const tmp = join(runDir, `phase.json.tmp-${process.pid}`);
  fs.writeFileSync(tmp, `${JSON.stringify(body)}\n`);
  try {
    fs.renameSync(tmp, target);
  } catch (err: unknown) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // Best effort: the rename's error is the one worth reporting.
    }
    throw err;
  }
}
