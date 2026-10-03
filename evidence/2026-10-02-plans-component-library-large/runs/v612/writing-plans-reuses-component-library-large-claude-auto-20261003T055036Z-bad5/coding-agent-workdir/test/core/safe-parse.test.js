import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeParse } from '../../src/core/json/safe-parse.js';

test('reports bad JSON without throwing', () => {
  assert.equal(safeParse('{"a":1}').value.a, 1);
  assert.equal(safeParse('{').ok, false);
});
