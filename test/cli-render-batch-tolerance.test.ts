import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderBatch } from '../src/cli/render-batch.ts';

// Parity with show.py:render_batch, which uses `if r.get("skipped")` (pure
// truthiness, no type check). A non-string `skipped` value must NOT abort the
// whole matrix render with a schema error — the canonical writer emits a string,
// but a degraded/foreign record must degrade one cell, not the table.

interface BatchOpts {
  // A raw `trial` value written straight into the record, bypassing the writer
  // that would only ever emit {index, count}.
  readonly trial?: unknown;
  // Set -> a schema-2 header, which selects the vector view.
  readonly repeat?: number;
}

function makeBatch(
  skippedValue: unknown,
  opts: BatchOpts = {},
): {
  batchDir: string;
  resultsRoot: string;
} {
  const root = mkdtempSync(join(tmpdir(), 'batch-'));
  const batchDir = join(root, 'batch');
  const resultsRoot = join(root, 'results');
  mkdirSync(batchDir, { recursive: true });
  mkdirSync(resultsRoot, { recursive: true });
  writeFileSync(
    join(batchDir, 'batch.json'),
    JSON.stringify({
      ...(opts.repeat !== undefined
        ? { schema_version: 2, repeat: opts.repeat }
        : {}),
      id: 'b-tol',
      started_at: '2026-06-14T00:00:00Z',
      coding_agents: ['claude'],
    }),
  );
  // A record whose `skipped` is a boolean rather than a string.
  const record = {
    scenario: 'alpha',
    coding_agent: 'claude',
    run_id: null,
    skipped: skippedValue,
    ...(opts.trial !== undefined ? { trial: opts.trial } : {}),
  };
  writeFileSync(join(batchDir, 'results.jsonl'), `${JSON.stringify(record)}\n`);
  return { batchDir, resultsRoot };
}

test('renderBatch treats a boolean-true `skipped` as skipped (no throw)', () => {
  const { batchDir, resultsRoot } = makeBatch(true);
  const out = renderBatch({ batchDir, resultsRoot, color: false });
  const alphaRow = out.split('\n').find((l) => l.startsWith('| alpha'));
  expect(alphaRow).toBeDefined();
  // Truthy skipped -> the skip glyph/label, not "? ?".
  expect(alphaRow).toContain('— skip');
});

test('renderBatch treats a falsy `skipped` (false) as not-skipped', () => {
  const { batchDir, resultsRoot } = makeBatch(false);
  const out = renderBatch({ batchDir, resultsRoot, color: false });
  const alphaRow = out.split('\n').find((l) => l.startsWith('| alpha'));
  expect(alphaRow).toBeDefined();
  // Falsy skipped + null run_id -> unknown cell, not skipped.
  expect(alphaRow).toContain('? ?');
  expect(alphaRow).not.toContain('— skip');
});

// Same policy as `skipped` above, for the same reason: readResults uses .parse,
// so a record-level schema failure aborts the entire matrix rather than one
// cell. A `trial` the writer would never emit must not be able to do that.

test('renderBatch survives a malformed `trial` on a record (no throw)', () => {
  const { batchDir, resultsRoot } = makeBatch(true, { trial: '2/3' });
  const out = renderBatch({ batchDir, resultsRoot, color: false });
  const alphaRow = out.split('\n').find((l) => l.startsWith('| alpha'));
  expect(alphaRow).toBeDefined();
  // The bad trial is dropped; the cell still renders from the rest of the record.
  expect(alphaRow).toContain('— skip');
});

test('a malformed `trial` degrades to the first vector slot, not a throw', () => {
  const { batchDir, resultsRoot } = makeBatch(true, {
    trial: '2/3',
    repeat: 3,
  });
  const out = renderBatch({ batchDir, resultsRoot, color: false });
  const alphaRow = out.split('\n').find((l) => l.startsWith('| alpha'));
  expect(alphaRow).toBeDefined();
  // Unreadable index -> the record lands in slot 1 and the rest pad, exactly as
  // an unstamped record does.
  expect(alphaRow).toContain('---');
});
