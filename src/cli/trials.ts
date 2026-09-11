import type { FinalStatus } from '../contracts/verdict.ts';
import { assertNever } from '../invariant.ts';

// One vector character per trial. A closed switch over FinalStatus (coding
// standard 5.1) so a new terminal state is a compile error here rather than a
// silent hole in the vector.
export function trialSymbol(final: FinalStatus): string {
  switch (final) {
    case 'pass':
      return 'P';
    case 'fail':
      return 'F';
    case 'indeterminate':
      return 'I';
    default:
      return assertNever(final);
  }
}

export interface TrialSummary {
  readonly vector: string;
  readonly exitCode: number;
}

// Aggregate a completed repeat run. Precedence is fail > indeterminate > pass:
// one failing trial makes the run a failure, and indeterminate wins only when
// nothing failed. For a single trial this reproduces the exit code an
// unrepeated run produced, which is what lets `--repeat 1` stay a drop-in for
// one.
//
// The caller guarantees a non-empty array (`--repeat` is validated >= 1). An
// empty array falls out of the same rule as 0: nothing failed.
export function summarizeTrials(finals: readonly FinalStatus[]): TrialSummary {
  const vector = finals.map(trialSymbol).join('');
  const exitCode = finals.includes('fail')
    ? 1
    : finals.includes('indeterminate')
      ? 2
      : 0;
  return { vector, exitCode };
}
