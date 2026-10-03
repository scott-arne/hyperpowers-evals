import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plural } from '../../src/core/format/plural.js';

test('uses the singular only for one', () => {
  assert.equal(plural(1, 'host'), '1 host');
  assert.equal(plural(0, 'host'), '0 hosts');
  assert.equal(plural(2, 'entry', 'entries'), '2 entries');
});
