import assert from 'node:assert/strict';
import { test } from 'node:test';
import { riskFromLabels } from './risk.js';

test('reads the risk label, defaulting to medium', () => {
  assert.equal(riskFromLabels(['change', 'risk:high']), 'high');
  assert.equal(riskFromLabels(['change']), 'medium');
});
