import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { trialSymbol } from './trials.ts';

// quorum show <batch> — scenario × agent matrix renderer.
//
// Glyphs, labels, the Legend line, and the tally string are part of the
// triage-output contract; do not paraphrase them.

// The five cell verdicts a matrix cell can take. Closed union so the glyph
// and color lookups stay exhaustive without an index-signature widening.
export type BatchVerdict =
  | 'pass'
  | 'fail'
  | 'indeterminate'
  | 'skipped'
  | 'unknown';

interface Glyph {
  readonly glyph: string;
  readonly label: string;
}

// NOTE the unknown label is "?" (not "no verdict"); only the Legend line spells
// out "no verdict". A missing-verdict cell renders "? ?".
export const BATCH_GLYPHS: Record<BatchVerdict, Glyph> = {
  pass: { glyph: '✓', label: 'pass' },
  fail: { glyph: '✗', label: 'fail' },
  indeterminate: { glyph: '⊘', label: 'indet' },
  skipped: { glyph: '—', label: 'skip' },
  unknown: { glyph: '?', label: '?' },
};

// Dracula palette. pass/fail/indet use the verdict colors; skipped/unknown use
// the label gray. Stored as rgb tuples; emitted as ANSI truecolor sequences.
type Rgb = readonly [number, number, number];

export const BATCH_GLYPH_COLORS: Record<BatchVerdict, Rgb> = {
  pass: [80, 250, 123],
  fail: [255, 85, 85],
  indeterminate: [241, 250, 140],
  skipped: [122, 130, 148],
  unknown: [122, 130, 148],
};

// rgb -> ANSI truecolor wrap, matching src/cli/render.ts:paint (which is not
// exported, so the sequence is re-derived here rather than reused).
function paint(text: string, rgb: Rgb, on: boolean): string {
  if (!on) {
    return text;
  }
  const [r, g, b] = rgb;
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

// A path is a batch dir if it contains batch.json.
export function isBatchDir(path: string): boolean {
  return existsSync(join(path, 'batch.json'));
}

// batch.json header. coding_agents is the column order; the timestamps drive
// the banner. Extra keys are preserved by batchJson but ignored by the matrix.
const BatchHeaderSchema = z.object({
  id: z.string(),
  started_at: z.string(),
  finished_at: z.string().nullable().optional(),
  coding_agents: z.array(z.string()),
  // Optional here, unlike the contracts module's required field: this renderer
  // deliberately tolerates partial headers (see cli-render-batch-tolerance),
  // and a header written before schema 2 has no repeat. Absent means 1.
  repeat: z.number().int().min(1).optional(),
});

// One results.jsonl record. run_id may be null (no run produced); skipped is a
// truthy directive marker, read with pure truthiness and never type-checked, so
// it is accepted as unknown here — a non-string skipped degrades one cell rather
// than aborting the whole matrix with a schema error.
const BatchResultSchema = z.object({
  scenario: z.string(),
  coding_agent: z.string(),
  run_id: z.string().nullable().optional(),
  skipped: z.unknown().optional(),
  // Declared, not inherited: zod strips keys a schema does not name, so without
  // this the vector view would never see a trial stamp and every repeat batch
  // would render in the legacy glyph path. Caught for the same reason `skipped`
  // is unknown: readResults parses with .parse, so a value the writer would
  // never emit must degrade one cell, not abort the whole matrix.
  trial: z
    .object({ index: z.number(), count: z.number() })
    .optional()
    .catch(undefined),
});

// verdict.json is opaque here apart from .final; narrow only that field. An
// unparseable file or a final outside the glyph set collapses to "unknown".
const VerdictFinalSchema = z.object({
  final: z.string(),
});

function isBatchVerdict(value: string): value is BatchVerdict {
  return (
    value === 'pass' ||
    value === 'fail' ||
    value === 'indeterminate' ||
    value === 'skipped' ||
    value === 'unknown'
  );
}

// Read a cell's verdict from <resultsRoot>/<runId>/verdict.json. Missing
// run_id, missing file, unparseable JSON, or an unknown `final` -> "unknown".
function cellVerdict(resultsRoot: string, runId: string | null): BatchVerdict {
  if (runId === null) {
    return 'unknown';
  }
  const verdictPath = join(resultsRoot, runId, 'verdict.json');
  if (!existsSync(verdictPath)) {
    return 'unknown';
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(verdictPath, 'utf8'));
  } catch {
    return 'unknown';
  }
  const parsed = VerdictFinalSchema.safeParse(raw);
  if (!parsed.success) {
    return 'unknown';
  }
  const final = parsed.data.final;
  return isBatchVerdict(final) ? final : 'unknown';
}

function readResults(batchDir: string): z.infer<typeof BatchResultSchema>[] {
  const text = readFileSync(join(batchDir, 'results.jsonl'), 'utf8');
  const rows: z.infer<typeof BatchResultSchema>[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    rows.push(BatchResultSchema.parse(JSON.parse(line)));
  }
  return rows;
}

function cellKey(scenario: string, agent: string): string {
  // Tab is absent from scenario/agent names, so it is a safe composite-key
  // separator for the per-cell lookup map.
  return `${scenario}\t${agent}`;
}

// The vector slot for a trial that produced no verdict of its own: a skipped
// cell, or a trial the batch never got to.
const TRIAL_DID_NOT_RUN = '-';

// Trial symbols for the repeat-run vector view. Distinct from BATCH_GLYPHS on
// purpose: the glyph table is a per-cell verdict and its vocabulary is contract,
// while a vector packs several trials into one cell and needs single characters.
// The three run outcomes reuse `quorum run`'s own vector letters so the two
// views cannot drift; "did not run" is not a FinalStatus and stays local.
const TRIAL_SYMBOLS: Record<BatchVerdict, string> = {
  pass: trialSymbol('pass'),
  fail: trialSymbol('fail'),
  indeterminate: trialSymbol('indeterminate'),
  skipped: TRIAL_DID_NOT_RUN,
  unknown: TRIAL_DID_NOT_RUN,
};

export const TRIAL_LEGEND =
  'Legend: P pass   F fail   I indeterminate   - did not run';

export interface RenderBatchArgs {
  readonly batchDir: string;
  readonly resultsRoot: string;
  readonly color: boolean;
}

// Returns the full multi-line table (banner, blank, header, separator, one row
// per scenario, blank, Legend, tally) with a trailing newline.
//
// Two cell modes, selected by the header's `repeat`: the glyph table for a
// one-child-per-cell batch (also every pre-schema-2 header, which has no
// `repeat`), and a per-trial symbol vector for a batch run with --repeat 2 or
// more.
export function renderBatch(args: RenderBatchArgs): string {
  const header = BatchHeaderSchema.parse(
    JSON.parse(readFileSync(join(args.batchDir, 'batch.json'), 'utf8')),
  );
  const rows = readResults(args.batchDir);

  const agents = header.coding_agents;
  const scenarios = [...new Set(rows.map((r) => r.scenario))].sort();
  const repeat = header.repeat ?? 1;
  const vector = repeat >= 2;

  const cellVerdicts = new Map<string, BatchVerdict>();
  // Per-cell trial list for the vector view, kept alongside the last-write-wins
  // cellVerdicts the glyph view uses.
  const cellTrials = new Map<
    string,
    { readonly index: number; readonly verdict: BatchVerdict }[]
  >();
  const counts: Record<BatchVerdict, number> = {
    pass: 0,
    fail: 0,
    indeterminate: 0,
    skipped: 0,
    unknown: 0,
  };

  // A record with no trial stamp is the batch's only trial of that cell. Only
  // the vector view reads cellTrials, so glyph renders do not build it.
  const recordTrial = (
    key: string,
    index: number,
    verdict: BatchVerdict,
  ): void => {
    if (!vector) {
      return;
    }
    const trials = cellTrials.get(key);
    if (trials === undefined) {
      cellTrials.set(key, [{ index, verdict }]);
      return;
    }
    trials.push({ index, verdict });
  };

  for (const r of rows) {
    const key = cellKey(r.scenario, r.coding_agent);
    // Truthiness gate: any truthy value (a directive string, true, ...) marks
    // the cell skipped; falsy or absent does not.
    if (r.skipped) {
      cellVerdicts.set(key, 'skipped');
      counts.skipped += 1;
      recordTrial(key, r.trial?.index ?? 1, 'skipped');
      continue;
    }
    const verdict = cellVerdict(args.resultsRoot, r.run_id ?? null);
    cellVerdicts.set(key, verdict);
    counts[verdict] += 1;
    recordTrial(key, r.trial?.index ?? 1, verdict);
  }

  // Column widths grow to fit content. A vector cell is `repeat` characters
  // wide; a glyph cell is as wide as its longest glyph+label.
  let scenW = Math.max(...scenarios.map((s) => s.length), 0);
  scenW = Math.max(scenW, 'scenario'.length);
  const cellW = vector
    ? Math.max(...agents.map((a) => a.length), repeat)
    : Math.max(...agents.map((a) => a.length), '⊘ indet'.length);

  // One vector cell: exactly `repeat` slots, ADDRESSED BY TRIAL INDEX rather
  // than filled in rank order. A slot the cell has no record for keeps its
  // "did not run" symbol, so a gap lands on the trial that is actually missing.
  // Packing survivors from slot 0 instead would file a verdict under a trial
  // number that never produced it, and the gaps a partial batch leaves are not
  // all at the tail: a cell's trials are independent scheduler units that can
  // finish out of order, and `quorum show` renders interrupted batches. Index
  // addressing also removes the need to sort by index first. Each symbol is
  // painted by its own verdict, since one cell can hold several.
  const vectorCell = (key: string): string => {
    const slots: BatchVerdict[] = Array.from(
      { length: repeat },
      () => 'unknown',
    );
    for (const t of cellTrials.get(key) ?? []) {
      const slot = t.index - 1;
      // An index that addresses no slot — past the end, before the start, or
      // not a whole number — is dropped rather than clamped. The record schema
      // only narrows `index` to a number, so a foreign or degraded writer can
      // produce any of the three, and clamping would commit exactly the
      // misattribution index addressing exists to prevent. Dropping degrades
      // one slot to "did not run"; the tally, counted at read time, is
      // unaffected. It also holds the cell to `repeat` symbols, so an
      // over-long cell cannot push its column out of alignment.
      if (!Number.isInteger(t.index) || slot < 0 || slot >= repeat) {
        continue;
      }
      // Duplicate indices in one cell (two malformed records both degrade to
      // index 1 under `r.trial?.index ?? 1`) are last-wins, matching
      // cellVerdicts, whose plain .set already lets a later record overwrite an
      // earlier one for the same cell. The two views must not disagree about
      // which record won.
      slots[slot] = t.verdict;
    }
    const painted = slots
      .map((v) => paint(TRIAL_SYMBOLS[v], BATCH_GLYPH_COLORS[v], args.color))
      .join('');
    // Pad against the symbol count: an ANSI wrapper has no display width, so
    // padEnd on the painted string would pad by the escape bytes too.
    const pad = ' '.repeat(Math.max(0, cellW - slots.length));
    return `${painted}${pad}`;
  };

  const lines: string[] = [];

  const banner =
    `batch ${header.id} · started ${header.started_at}` +
    (header.finished_at !== undefined && header.finished_at !== null
      ? ` · finished ${header.finished_at}`
      : '');
  lines.push(banner);
  lines.push('');

  const headerRow = `| ${'scenario'.padEnd(scenW)} | ${agents
    .map((a) => a.padEnd(cellW))
    .join(' | ')} |`;
  lines.push(headerRow);

  const sep = `|${'-'.repeat(scenW + 2)}|${agents
    .map(() => '-'.repeat(cellW + 2))
    .join('|')}|`;
  lines.push(sep);

  for (const s of scenarios) {
    const rowCells = agents.map((a) => {
      const key = cellKey(s, a);
      if (vector) {
        return vectorCell(key);
      }
      const verdict = cellVerdicts.get(key) ?? 'unknown';
      const { glyph, label } = BATCH_GLYPHS[verdict];
      const text = `${glyph} ${label}`.padEnd(cellW);
      return paint(text, BATCH_GLYPH_COLORS[verdict], args.color);
    });
    lines.push(`| ${s.padEnd(scenW)} | ${rowCells.join(' | ')} |`);
  }

  lines.push('');
  lines.push(
    vector
      ? TRIAL_LEGEND
      : 'Legend: ✓ pass   ✗ fail   ⊘ indeterminate   — skipped (directive)   ? no verdict',
  );
  const tally =
    `${counts.pass} ✓ · ${counts.fail} ✗ · ` +
    `${counts.indeterminate} ⊘ · ${counts.skipped} —` +
    (counts.unknown ? ` · ${counts.unknown} ?` : '');
  lines.push(tally);

  return `${lines.join('\n')}\n`;
}

// --json batch payload shape (the integrator prints this for `show --json` on a
// batch): the parsed batch.json header spread with a `results` array of the
// parsed results.jsonl records. Returned as unknown — it is print-only JSON,
// not a typed contract.
export function batchJson(batchDir: string): unknown {
  const header: unknown = JSON.parse(
    readFileSync(join(batchDir, 'batch.json'), 'utf8'),
  );
  const results: unknown[] = [];
  const text = readFileSync(join(batchDir, 'results.jsonl'), 'utf8');
  for (const line of text.split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    results.push(JSON.parse(line));
  }
  if (header !== null && typeof header === 'object') {
    return { ...header, results };
  }
  return { results };
}
