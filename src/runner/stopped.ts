import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FinalVerdict, Provenance, Trial } from '../contracts/verdict.ts';

export interface StoppedIdentity {
  readonly scenario: string;
  readonly codingAgent: string;
  readonly startedAt: string;
  // Repeat-run provenance for the interrupted trial. The interrupted trial is
  // the one whose position in the sequence matters most — without the stamp it
  // is the single verdict in the group that cannot be placed.
  readonly trial?: Trial;
  // The harness provenance the runner captured, handed over in memory
  // (onProvenance). provenance.json sits in a directory the Coding-Agent can
  // write, so a stopped verdict never reads it back; a run interrupted before
  // the capture has none.
  readonly provenance?: Provenance;
}

// The verdict written when a run is interrupted by SIGINT (dashboard Stop).
// indeterminate + error.stage "stopped" (a valid RUN_ERROR_STAGES member). The
// cell resolves to indeterminate instead of vanishing under the dead-pid rule.
export function buildStoppedVerdict(id: StoppedIdentity): FinalVerdict {
  return {
    schema: 1,
    final: 'indeterminate',
    final_reason: 'run stopped before completion',
    gauntlet: null,
    checks: [],
    error: { stage: 'stopped', message: 'run interrupted by SIGINT' },
    economics: null,
    scenario: id.scenario,
    coding_agent: id.codingAgent,
    started_at: id.startedAt,
    finished_at: new Date().toISOString(),
    ...(id.trial !== undefined ? { trial: id.trial } : {}),
    ...(id.provenance !== undefined ? { provenance: id.provenance } : {}),
  };
}

export function writeStoppedVerdict(runDir: string, id: StoppedIdentity): void {
  writeFileSync(
    join(runDir, 'verdict.json'),
    `${JSON.stringify(buildStoppedVerdict(id), null, 2)}\n`,
  );
}
