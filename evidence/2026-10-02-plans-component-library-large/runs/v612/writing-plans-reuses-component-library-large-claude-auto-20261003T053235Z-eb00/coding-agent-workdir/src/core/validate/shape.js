import { isIsoDate } from './is-iso-date.js';

const CHECKS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  timestamp: isIsoDate,
  array: Array.isArray,
};

// Checks one record against `{ field: type }`, where a type ending in "?"
// also allows null. Returns the problems found; an empty list means valid.
export function checkShape(record, spec) {
  const problems = [];
  for (const [field, type] of Object.entries(spec)) {
    const optional = type.endsWith('?');
    const base = optional ? type.slice(0, -1) : type;
    const value = record[field];
    if (value === null && optional) continue;
    if (value === undefined) problems.push(`missing ${field}`);
    else if (!CHECKS[base](value)) problems.push(`${field} is not a ${base}`);
  }
  return problems;
}
