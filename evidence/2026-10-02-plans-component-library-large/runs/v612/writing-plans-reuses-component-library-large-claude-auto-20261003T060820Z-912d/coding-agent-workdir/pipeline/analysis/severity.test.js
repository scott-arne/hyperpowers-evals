import assert from 'node:assert/strict';
import { test } from 'node:test';
import { severityFromPriority } from './severity.js';

test('maps priorities, folding P4 and P5 into sev3', () => {
  assert.equal(severityFromPriority('P1'), 'sev1');
  assert.equal(severityFromPriority('P5'), 'sev3');
  assert.throws(() => severityFromPriority('high'), /unknown priority/);
});
