import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fnv1a } from '../../src/core/hash/fnv1a.js';

test('matches the published FNV-1a vectors', () => {
  assert.equal(fnv1a(''), 0x811c9dc5);
  assert.equal(fnv1a('a'), 0xe40c292c);
});
