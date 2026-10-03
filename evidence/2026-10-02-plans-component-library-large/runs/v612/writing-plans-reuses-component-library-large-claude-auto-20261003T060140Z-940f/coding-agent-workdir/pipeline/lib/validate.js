import { SnapshotError } from '../../src/core/errors/snapshot-error.js';
import { checkShape } from '../../src/core/validate/shape.js';

// Throws before anything is written, so a bad upstream response leaves the
// previous snapshot in place.
export function validateRows(name, rows, fields) {
  if (!Array.isArray(rows)) throw new SnapshotError(name, ['rows is not a list']);
  const problems = rows.flatMap((row, i) => checkShape(row, fields).map((p) => `row ${i}: ${p}`));
  if (problems.length > 0) throw new SnapshotError(name, problems);
}
