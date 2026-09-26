import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import type { BatchHeader, ResultRecord } from '../contracts/batch.ts';
import { BatchHeaderSchema } from '../contracts/batch.ts';
import { getEnv } from '../env.ts';
import { hexNonce, nowStampUtc } from '../paths.ts';
import { runGit } from '../setup-helpers/git.ts';

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

// Which superpowers checkout a batch ran against. Recorded because nothing
// else in a run's artifacts identifies it: the bootstrap text a session is
// injected with is deliberately held byte-identical across heads, so three
// commits can share it while carrying three different skills/ trees.
interface SuperpowersProvenance {
  readonly superpowers_commit: string;
  readonly superpowers_skills_tree: string;
  readonly superpowers_dirty: boolean;
}

// Resolve SUPERPOWERS_ROOT's head, its skills tree, and whether skills/ or
// hooks/ has uncommitted work. Resolved HERE rather than passed in by the
// caller: run-all
// and the dashboard both write headers, and a parameter is one more thing for
// the two paths to drift on.
//
// Returns undefined when the root is unset or is not a git checkout. The
// caller then omits the fields entirely — a placeholder or an empty sha would
// turn "could not record provenance" into something a reader cannot tell apart
// from "recorded it and it matched".
function superpowersProvenance(): SuperpowersProvenance | undefined {
  // Env is read ONLY through the sanctioned module, never process.env.
  const root = getEnv('SUPERPOWERS_ROOT');
  if (!root) return undefined;
  try {
    const commit = runGit(['rev-parse', 'HEAD'], root).trim();
    // `HEAD:skills` is the tree object id, resolved before the status read so
    // a root without a skills/ tree leaves through the catch below.
    const skillsTree = runGit(['rev-parse', 'HEAD:skills'], root).trim();
    // Both trees ship in the staged plugin payload, so both can change what a
    // session loads; the spec's provenance rule names skills/ and hooks/
    // together. --untracked-files=normal on purpose: the payload is copied from
    // the working tree, so an untracked new file ships exactly like a modified
    // tracked one and must count as dirty.
    const status = runGit(
      [
        'status',
        '--porcelain',
        '--untracked-files=normal',
        '--',
        'skills',
        'hooks',
      ],
      root,
    );
    return {
      superpowers_commit: commit,
      superpowers_skills_tree: skillsTree,
      superpowers_dirty: status.trim() !== '',
    };
  } catch {
    // A missing directory, a non-git root, or a HEAD with no skills/ tree.
    // Provenance is evidence about the batch, not a precondition for running
    // one, so nothing throws out of the writer.
    return undefined;
  }
}

// Write batch.json at batch start; finished_at is null.
export function writeBatchHeader(args: WriteBatchHeaderArgs): void {
  const provenance = superpowersProvenance();
  const data: BatchHeader = {
    schema_version: 3,
    id: basename(args.batchDir),
    started_at: args.startedAt,
    finished_at: null,
    coding_agents: [...args.codingAgents],
    jobs: args.jobs,
    repeat: args.repeat,
    ...(provenance ?? {}),
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
//
// passthrough, because this is a read-modify-write of a file another version of
// the writer may own: a strict parse would drop (or, for a stricter schema,
// reject) any key a newer schema_version added, and the footer would silently
// truncate the header it was only meant to stamp.
export function writeBatchFooter(args: WriteBatchFooterArgs): void {
  const path = join(args.batchDir, 'batch.json');
  const header = BatchHeaderSchema.passthrough().parse(
    JSON.parse(readFileSync(path, 'utf8')) as unknown,
  );
  const data = { ...header, finished_at: args.finishedAt };
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
