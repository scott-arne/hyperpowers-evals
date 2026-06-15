// check/record.ts — drop-in TS equivalent of quorum/bin/_record.
//
// Reads QUORUM_RECORD_SINK from the environment. When unset, all calls are
// no-ops so callers don't need to guard around it.
//
// Emitted JSON line shape (mirrors the shell _record_emit format):
//   {"check":<string>,"args":<string[]>,"negated":false,"passed":<bool>,"detail":<string|null>}

import { appendFileSync } from 'node:fs';
import { getEnv } from '../env.ts';

interface RecordLine {
  check: string;
  args: string[];
  negated: boolean;
  passed: boolean;
  detail: string | null;
}

function emit(
  check: string,
  args: string[],
  passed: boolean,
  detail: string | undefined,
  negated: boolean,
): void {
  const sink = getEnv('QUORUM_RECORD_SINK');
  if (!sink) return;

  const line: RecordLine = {
    check,
    args,
    negated,
    passed,
    detail: detail !== undefined && detail !== '' ? detail : null,
  };
  appendFileSync(sink, `${JSON.stringify(line)}\n`);
}

export function recordPass(
  check: string,
  args: string[],
  detail?: string,
): void {
  emit(check, args, true, detail, false);
}

export function recordFail(
  check: string,
  args: string[],
  detail?: string,
): void {
  emit(check, args, false, detail, false);
}

/**
 * Emit a record with an explicit `negated` flag — the `not` path's single
 * negated record (check=<inner>, negated:true), and `not`'s own refusal record
 * (check=not, negated:false). Mirrors bin/_record's record_negated.
 */
export function recordWith(
  check: string,
  args: string[],
  passed: boolean,
  negated: boolean,
  detail?: string,
): void {
  emit(check, args, passed, detail, negated);
}
