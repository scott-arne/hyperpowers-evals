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

test('prints a heading, one aligned row per service, then the failing checks', () => {
  assert.equal(
    formatStatus(snapshot),
    [
      'staging: 2 services, as of 2026-09-30 08:12 UTC',
      '',
      'SERVICE   VERSION   READY   DEPLOYED           HEALTH',
      'auth      1.8.0     2/2     2026-09-30 07:15   ok',
      'billing   4.2.3     2/3     2026-09-28 17:40   FAILING',
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

test('leaves out the failing-checks section when every check passes', () => {
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

test('lists each failing check of a service on its own line, in order', () => {
  const search = {
    name: 'search',
    version: '1.12.0',
    replicas: { ready: 2, desired: 3 },
    deployedAt: '2026-09-29T10:10:00Z',
    health: {
      checkedAt: '2026-09-30T08:11:40Z',
      checks: [
        { name: 'disk-space', status: 'failing', detail: '91% used' },
        passing('http'),
        { name: 'index-freshness', status: 'failing', detail: 'last update 47 min ago' },
      ],
    },
  };
  const out = formatStatus({ ...snapshot, services: [search] });
  assert.deepEqual(out.split('Failing checks:\n')[1].split('\n'), [
    '  search   disk-space        91% used',
    '  search   index-freshness   last update 47 min ago',
    '',
  ]);
});

test('prints a failing check without a detail', () => {
  const noDetail = {
    ...snapshot.services[0],
    health: { checkedAt: '2026-09-30T08:11:40Z', checks: [{ name: 'http', status: 'failing' }] },
  };
  const out = formatStatus({ ...snapshot, services: [noDetail] });
  assert.match(out, /^auth .* FAILING$/m);
  assert.deepEqual(out.split('Failing checks:\n')[1].split('\n'), ['  auth   http', '']);
});
