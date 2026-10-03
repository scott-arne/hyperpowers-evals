import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildQuery } from '../../src/core/http/query-string.js';

test('skips null and undefined values', () => {
  assert.equal(buildQuery({ region: 'eu-west-1', page: null, q: undefined }), '?region=eu-west-1');
});

test('returns an empty string when nothing is left', () => {
  assert.equal(buildQuery({}), '');
});
