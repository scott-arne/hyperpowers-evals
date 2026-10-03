import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slugify } from '../../src/core/strings/slugify.js';

test('makes url-safe slugs', () => {
  assert.equal(slugify('  Café Ops: Weekly Review! '), 'cafe-ops-weekly-review');
});
