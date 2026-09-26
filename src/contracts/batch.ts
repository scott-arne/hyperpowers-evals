import { z } from 'zod';
import { TrialSchema } from './verdict.ts';

// Batch index contracts. Every JSON read at these boundaries is zod-narrowed;
// the writers live in src/run-all/batch-index.ts (batch.json indent 2,
// results.jsonl one compact record per line).

// batch.json — written once at batch start (finished_at null), patched at end.
// schema_version 2 adds `repeat`: the number of trials each runnable cell was
// expanded into. 1 means the pre-repeat behavior, one child per cell.
// schema_version 3 adds the provenance of the SUPERPOWERS_ROOT checkout the
// batch ran against (see superpowersProvenance in src/run-all/batch-index.ts).
//
// Both versions are accepted and the provenance fields are optional, because
// schema-2 headers written by the previous writer are already on disk under
// results/batches/ and are read with this schema. A schema-3 header also omits
// the fields when the root could not be resolved: absent means "not recorded",
// never "recorded and empty".
export const BatchHeaderSchema = z.object({
  schema_version: z.union([z.literal(2), z.literal(3)]),
  id: z.string(),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  coding_agents: z.array(z.string()),
  jobs: z.number(),
  repeat: z.number().int().min(1),
  // The resolved 40-hex HEAD of SUPERPOWERS_ROOT.
  superpowers_commit: z.string().optional(),
  // The object id of the `skills` tree at that HEAD. This is the field that
  // discriminates one head from another; the commit is provenance.
  superpowers_skills_tree: z.string().optional(),
  // True when skills/ or hooks/ carried uncommitted work, tracked or
  // untracked. The staged plugin payload is copied from the WORKING TREE, so a
  // dirty tree means the commit does not describe what ran.
  superpowers_dirty: z.boolean().optional(),
});
export type BatchHeader = z.infer<typeof BatchHeaderSchema>;

// results.jsonl — one record per trial of a (scenario, agent) cell. `skipped`
// is omitted (not null) when the cell actually ran; `trial` is omitted when the
// batch ran with repeat 1 or the cell was skipped.
export const ResultRecordSchema = z.object({
  scenario: z.string(),
  coding_agent: z.string(),
  run_id: z.string().nullable(),
  skipped: z.string().optional(),
  // Imported from the verdict contract, not restated. The batch record and the
  // verdict it points at describe the same trial; two literal copies of the
  // shape is two places for them to drift apart.
  trial: TrialSchema.optional(),
});
export type ResultRecord = z.infer<typeof ResultRecordSchema>;

// Why a cell is not runnable. null == runnable. Precedence (highest first):
// directive > draft > tier (see buildMatrix).
export type SkippedReason = 'directive' | 'draft' | 'tier' | null;

// One (scenario, agent) cell of the batch matrix. `runnable` is the helper below
// rather than a property to keep the type plain.
export interface MatrixEntry {
  readonly scenario: string;
  readonly codingAgent: string;
  readonly scenarioDir: string;
  readonly skippedReason: SkippedReason;
  readonly tier: 'sentinel' | 'full' | 'adhoc';
  readonly status: string;
}

// A cell runs iff it carries no skip reason.
export function runnable(entry: MatrixEntry): boolean {
  return entry.skippedReason === null;
}

// Outcome of one child `quorum run` invocation.
//   run_id    — the run-dir basename the child printed, or null if it crashed
//               before allocating one.
//   exit_code — child process exit code (0 pass / 1 fail / 2 indeterminate;
//               anything else abnormal). -1 marks a timeout.
//   error     — short process-level description when something went wrong
//               (couldn't parse run-id, timeout). A `fail` verdict is NOT an error.
export interface ChildResult {
  readonly run_id: string | null;
  readonly exit_code: number;
  readonly error: string | null;
}
