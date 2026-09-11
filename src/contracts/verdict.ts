import { z } from 'zod';

export const GAUNTLET_STATUSES = [
  'pass',
  'fail',
  'investigate',
  'errored',
] as const;
export const FINAL_STATUSES = ['pass', 'fail', 'indeterminate'] as const;
export const RUN_ERROR_STAGES = [
  'setup',
  'gauntlet',
  'capture',
  'checks',
  'compose',
  'qa-agent-misconfigured',
  'stopped',
  'unknown',
] as const;
export const CHECK_PHASES = ['pre', 'post'] as const;

export type GauntletStatus = (typeof GAUNTLET_STATUSES)[number];
export type FinalStatus = (typeof FINAL_STATUSES)[number];
export type RunErrorStage = (typeof RUN_ERROR_STAGES)[number];
export type CheckPhase = (typeof CHECK_PHASES)[number];

export const CheckRecordSchema = z.object({
  check: z.string(),
  args: z.array(z.string()),
  negated: z.boolean(),
  passed: z.boolean(),
  detail: z.string().nullable(),
  phase: z.enum(CHECK_PHASES),
});
export type CheckRecord = z.infer<typeof CheckRecordSchema>;

export const GauntletLayerSchema = z.object({
  status: z.enum(GAUNTLET_STATUSES),
  summary: z.string(),
  reasoning: z.string(),
  run_id: z.string().nullable(),
});
export type GauntletLayer = z.infer<typeof GauntletLayerSchema>;

export const RunErrorSchema = z.object({
  stage: z.enum(RUN_ERROR_STAGES),
  message: z.string(),
});
export type RunError = z.infer<typeof RunErrorSchema>;

// Repeat-run provenance. Present only when the verdict came from a
// `--repeat n` trial; a single ungrouped run omits it entirely. Additive and
// optional, so `schema` stays at 1.
export const TrialSchema = z.object({
  index: z.number().int().min(1),
  count: z.number().int().min(1),
});
export type Trial = z.infer<typeof TrialSchema>;

// economics is structurally validated in contracts/economics.ts; opaque here.
export const FinalVerdictSchema = z.object({
  schema: z.literal(1),
  final: z.enum(FINAL_STATUSES),
  final_reason: z.string(),
  gauntlet: GauntletLayerSchema.nullable(),
  checks: z.array(CheckRecordSchema),
  error: RunErrorSchema.nullable(),
  economics: z.record(z.unknown()).nullable(),
  // Self-identity (dashboard read-side). Optional so a verdict lacking these
  // fields falls back to run-dir-name parsing. The runner writes all four.
  scenario: z.string().optional(),
  coding_agent: z.string().optional(),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  trial: TrialSchema.optional(),
});
export type FinalVerdict = z.infer<typeof FinalVerdictSchema>;
