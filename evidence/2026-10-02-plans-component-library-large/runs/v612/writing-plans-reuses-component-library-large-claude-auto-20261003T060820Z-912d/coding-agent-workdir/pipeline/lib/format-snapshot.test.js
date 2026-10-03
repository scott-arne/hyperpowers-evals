import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatSnapshot, snapshotTime } from './format-snapshot.js';

test('writes one row per line with extras before the rows', () => {
  const text = formatSnapshot({
    generatedAt: '2026-10-01T09:30:00Z',
    key: 'rotations',
    rows: [{ team: 'platform', primary: 'dana' }],
    extra: { escalation: ['Page the primary.'] },
  });
  assert.equal(
    text,
    '{\n  "generatedAt": "2026-10-01T09:30:00Z",\n  "escalation": ["Page the primary."],\n  "rotations": [\n    { "team": "platform", "primary": "dana" }\n  ]\n}\n',
  );
});

test('drops milliseconds from the snapshot time', () => {
  assert.equal(snapshotTime(Date.parse('2026-10-01T09:30:00.250Z')), '2026-10-01T09:30:00Z');
});
