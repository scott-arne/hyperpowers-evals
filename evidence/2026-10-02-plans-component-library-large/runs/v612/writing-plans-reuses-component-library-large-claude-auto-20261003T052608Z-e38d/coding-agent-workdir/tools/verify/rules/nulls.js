import { SCHEMAS } from '../../../src/shared/schemas/index.js';

// A field that is null in every row usually means the upstream renamed it.
export function nulls(snapshot, { name }) {
  const spec = SCHEMAS[name];
  const rows = spec ? snapshot[spec.key] ?? [] : [];
  if (rows.length < 2) return [];
  return Object.keys(spec.fields)
    .filter((field) => rows.every((row) => row[field] === null))
    .map((field) => `${field} is null in every row`);
}
