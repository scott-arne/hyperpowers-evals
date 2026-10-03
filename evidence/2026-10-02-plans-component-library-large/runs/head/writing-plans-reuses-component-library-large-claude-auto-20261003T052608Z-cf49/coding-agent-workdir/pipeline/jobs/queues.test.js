import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/queues.js';
import { collect } from './queues.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { rabbitmq: { queues: async () => fixture('queues.json') } };
const invalid = { rabbitmq: { queues: async () => fixture('queues.invalid.json') } };

test('queues: maps RabbitMQ management API records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('queues.expected.json'));
});

test('queues: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('queues: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
