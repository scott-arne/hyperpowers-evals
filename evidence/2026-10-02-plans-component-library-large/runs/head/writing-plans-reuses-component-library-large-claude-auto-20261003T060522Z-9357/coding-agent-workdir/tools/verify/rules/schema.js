import { checkShape } from '../../../src/core/validate/shape.js';
import { SCHEMAS } from '../../../src/shared/schemas/index.js';

export function schema(snapshot, { name }) {
  const spec = SCHEMAS[name];
  if (!spec) return [`no schema for ${name}`];
  const rows = snapshot[spec.key];
  if (!Array.isArray(rows)) return [`no "${spec.key}" list`];
  return rows.flatMap((row, i) => checkShape(row, spec.fields).map((p) => `row ${i}: ${p}`));
}
