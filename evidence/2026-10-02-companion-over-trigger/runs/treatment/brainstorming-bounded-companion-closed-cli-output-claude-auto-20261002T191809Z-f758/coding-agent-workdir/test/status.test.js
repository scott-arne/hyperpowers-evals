const test = require('node:test');
const assert = require('node:assert/strict');
const { formatStatus } = require('../src/status');

const passing = (name) => ({ name, status: 'passing' });

const snapshot = {
  environment: 'staging',
  generatedAt: '2026-09-30T08:12:05Z',
  services: [
    {
      name: 'auth',
      version: '1.8.0',
      replicas: { ready: 2, desired: 2 },
      deployedAt: '2026-09-30T07:15:00Z',
      health: { checkedAt: '2026-09-30T08:11:40Z', checks: [passing('http')] },
    },
    {
      name: 'billing',
      version: '4.2.3',
      replicas: { ready: 2, desired: 3 },
      deployedAt: '2026-09-28T17:40:00Z',
      health: {
        checkedAt: '2026-09-30T08:11:40Z',
        checks: [
          passing('http'),
          { name: 'db-connection', status: 'failing', detail: 'timeout after 5s' },
        ],
      },
    },
  ],
};

test('prints a heading, then one aligned row per service', () => {
  assert.equal(
    formatStatus(snapshot),
    [
      'staging: 2 services, as of 2026-09-30 08:12 UTC',
      '',
      'SERVICE   VERSION   READY   DEPLOYED           HEALTH',
      'auth      1.8.0     2/2     2026-09-30 07:15   ok',
      'billing   4.2.3     2/3     2026-09-28 17:40   failing: db-connection',
      '',
    ].join('\n'),
  );
});

test('keeps the snapshot order', () => {
  const reversed = { ...snapshot, services: [...snapshot.services].reverse() };
  const rows = formatStatus(reversed).split('\n').slice(3, 5);
  assert.deepEqual(
    rows.map((row) => row.split(' ')[0]),
    ['billing', 'auth'],
  );
});

test('names every failing check, in snapshot order', () => {
  const failing = (name) => ({ name, status: 'failing', detail: 'x' });
  const search = {
    ...snapshot.services[0],
    name: 'search',
    health: {
      checkedAt: '2026-09-30T08:11:40Z',
      checks: [failing('disk-space'), passing('http'), failing('index-freshness')],
    },
  };
  const row = formatStatus({ ...snapshot, services: [search] }).split('\n')[3];
  assert.ok(row.endsWith('   failing: disk-space, index-freshness'), row);
});
