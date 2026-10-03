import { SCHEMAS } from '../../../src/shared/schemas/index.js';

// Only snapshots with an `id` field have a natural key; services, say, repeat
// a name once per environment on purpose.
export function duplicates(snapshot, { name }) {
  const spec = SCHEMAS[name];
  if (!spec || !('id' in spec.fields)) return [];
  const seen = new Set();
  const problems = [];
  for (const row of snapshot[spec.key] ?? []) {
    if (seen.has(row.id)) problems.push(`duplicate id ${row.id}`);
    seen.add(row.id);
  }
  return problems;
}
