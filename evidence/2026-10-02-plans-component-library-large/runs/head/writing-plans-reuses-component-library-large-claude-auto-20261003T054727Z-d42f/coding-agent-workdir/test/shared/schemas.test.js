import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { SCHEMAS } from '../../src/shared/schemas/index.js';

const DATA = new URL('../../data/', import.meta.url);

// Every checked-in snapshot must match the schema the pipeline validates
// against, or the dashboard is tested against data the pipeline cannot write.
for (const file of readdirSync(DATA).filter((f) => f.endsWith('.json'))) {
  const name = file.replace(/\.json$/, '');
  test(`data/${file} matches its schema`, () => {
    const schema = SCHEMAS[name];
    assert.ok(schema, `no schema for ${name}`);
    const snapshot = JSON.parse(readFileSync(new URL(file, DATA), 'utf8'));
    assert.ok(Array.isArray(snapshot[schema.key]), `${file} has no "${schema.key}" list`);
    for (const row of snapshot[schema.key]) assert.deepEqual(checkShape(row, schema.fields), []);
  });
}
