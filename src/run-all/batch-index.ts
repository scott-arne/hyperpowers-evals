import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import type { BatchHeader, ResultRecord } from '../contracts/batch.ts';
import { BatchHeaderSchema } from '../contracts/batch.ts';
import { hexNonce, nowStampUtc } from '../paths.ts';

// Batch index writers: allocate the batch dir and write batch.json / its footer
// / results.jsonl records. The on-disk byte shapes are a contract: batch.json is
// indent-2 with NO trailing newline; results.jsonl is one compact record per
// line using ", " / ": " separators, with the `skipped` key omitted when the
// cell ran.

// "batch-<stamp>-<nonce>"; nonce is 4 hex chars (token_hex(2)). REUSE
// nowStampUtc + hexNonce from src/paths.ts (_make_batch_id).
export function makeBatchId(stamp: string, nonceHex: string): string {
  return `batch-${stamp}-${nonceHex}`;
}

export interface AllocateBatchDirArgs {
  readonly outRoot: string;
}

// Create results/batches/<id>/ and return its path; retry on a nonce collision
// up to 100 attempts. mkdir with recursive:false so an existing dir surfaces as
// a collision to retry.
export function allocateBatchDir(args: AllocateBatchDirArgs): string {
  const batchesRoot = join(args.outRoot, 'batches');
  mkdirSync(batchesRoot, { recursive: true });
  for (let i = 0; i < 100; i++) {
    const candidate = join(batchesRoot, makeBatchId(nowStampUtc(), hexNonce()));
    try {
      mkdirSync(candidate, { recursive: false });
      return candidate;
    } catch (e) {
      // Only a nonce collision is retryable. A bare catch also swallows an
      // unwritable root or a full disk, spends all 100 attempts on it, and
      // then reports the wrong cause.
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    }
  }
  throw new Error(
    'could not allocate a unique batch id after 100 attempts ' +
      `(clock or RNG malfunction?) in ${batchesRoot}`,
  );
}

export interface WriteBatchHeaderArgs {
  readonly batchDir: string;
  readonly codingAgents: readonly string[];
  readonly jobs: number;
  // Trials per runnable cell. Required, not defaulted: a schema-2 header with
  // no `repeat` fails BatchHeaderSchema at read time, so every writer has to
  // say what it ran (the dashboard, which has no repeat concept, passes 1).
  readonly repeat: number;
  readonly startedAt: string;
}

// Write batch.json at batch start; finished_at is null.
export function writeBatchHeader(args: WriteBatchHeaderArgs): void {
  const data: BatchHeader = {
    schema_version: 2,
    id: basename(args.batchDir),
    started_at: args.startedAt,
    finished_at: null,
    coding_agents: [...args.codingAgents],
    jobs: args.jobs,
    repeat: args.repeat,
  };
  // indent-2 with NO trailing newline, per the on-disk format.
  writeFileSync(
    join(args.batchDir, 'batch.json'),
    JSON.stringify(data, null, 2),
  );
}

export interface WriteBatchFooterArgs {
  readonly batchDir: string;
  readonly finishedAt: string;
}

// Patch batch.json with finished_at when the batch completes. Re-reads +
// zod-narrows the existing header rather than trusting prior bytes.
export function writeBatchFooter(args: WriteBatchFooterArgs): void {
  const path = join(args.batchDir, 'batch.json');
  const header = BatchHeaderSchema.parse(
    JSON.parse(readFileSync(path, 'utf8')) as unknown,
  );
  const data: BatchHeader = { ...header, finished_at: args.finishedAt };
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export interface AppendResultRecordArgs {
  readonly batchDir: string;
  readonly scenario: string;
  readonly codingAgent: string;
  readonly runId: string | null;
  readonly skipped: string | null;
  // The trial this record is one of, or null for a cell that was never
  // expanded (an upfront skip). Required so no call site can forget it and
  // silently write an unstamped record.
  readonly trial: { readonly index: number; readonly count: number } | null;
}

// Append one record to results.jsonl. Omits the `skipped` and `trial` keys when
// null. Serialized with the ", " / ": " separators the on-disk format requires.
export function appendResultRecord(args: AppendResultRecordArgs): void {
  const rec: ResultRecord = {
    scenario: args.scenario,
    coding_agent: args.codingAgent,
    run_id: args.runId,
    ...(args.skipped !== null ? { skipped: args.skipped } : {}),
    ...(args.trial !== null ? { trial: args.trial } : {}),
  };
  appendFileSync(
    join(args.batchDir, 'results.jsonl'),
    `${pyCompactJson(rec)}\n`,
  );
}

// Serialize a record with ", " between members and ": " after keys. JS
// JSON.stringify omits those spaces, so we emit the members by hand. Values are
// strings, null, or a one-level-deep object of numbers (the trial stamp); the
// nested object gets the same separators so the whole line stays one shape.
// Key order is the object's insertion order.
function pyCompactJson(rec: ResultRecord): string {
  const encode = (value: unknown): string => {
    if (value !== null && typeof value === 'object') {
      const inner = Object.entries(value as Record<string, unknown>).map(
        ([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`,
      );
      return `{${inner.join(', ')}}`;
    }
    return value === undefined ? 'null' : JSON.stringify(value);
  };
  const parts: string[] = [];
  for (const [key, value] of Object.entries(rec)) {
    parts.push(`${JSON.stringify(key)}: ${encode(value)}`);
  }
  return `{${parts.join(', ')}}`;
}
