import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVersions } from '../../src/core/semver/compare.js';

test('orders releases numerically', () => {
  assert.equal(compareVersions('1.10.0', '1.9.3'), 1);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
});

test('puts a pre-release before its release', () => {
  assert.equal(compareVersions('1.23.0-rc.1', '1.23.0'), -1);
  assert.equal(compareVersions('1.23.0-rc.1', '1.23.0-rc.2'), -1);
});
