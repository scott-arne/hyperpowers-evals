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
      'billing   4.2.3     2/3     2026-09-28 17:40   1 failing',
      '',
      'Failing checks:',
      '  billing   db-connection   timeout after 5s',
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

test('omits the failing-checks section when every check passes', () => {
  const healthy = { ...snapshot, services: [snapshot.services[0]] };
  assert.equal(
    formatStatus(healthy),
    [
      'staging: 1 services, as of 2026-09-30 08:12 UTC',
      '',
      'SERVICE   VERSION   READY   DEPLOYED           HEALTH',
      'auth      1.8.0     2/2     2026-09-30 07:15   ok',
      '',
    ].join('\n'),
  );
});

test('lists every failing check, aligned, in snapshot order', () => {
  const search = {
    name: 'search',
    version: '1.12.0',
    replicas: { ready: 2, desired: 3 },
    deployedAt: '2026-09-29T10:10:00Z',
    health: {
      checkedAt: '2026-09-30T08:11:40Z',
      checks: [
        passing('http'),
        { name: 'disk-space', status: 'failing', detail: '91% used' },
        { name: 'index-freshness', status: 'failing' },
      ],
    },
  };
  const output = formatStatus({ ...snapshot, services: [...snapshot.services, search] });
  assert.match(output, /^search {4}1\.12\.0 {4}2\/3 {5}2026-09-29 10:10 {3}2 failing$/m);
  assert.ok(
    output.endsWith(
      [
        'Failing checks:',
        '  billing   db-connection     timeout after 5s',
        '  search    disk-space        91% used',
        '  search    index-freshness',
        '',
      ].join('\n'),
    ),
  );
});
