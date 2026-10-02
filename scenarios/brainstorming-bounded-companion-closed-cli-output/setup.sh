#!/usr/bin/env bash
set -euo pipefail

# Fixture: a small command-line tool, `svc`, whose `status` command prints one
# table row per service. The snapshot it reads already carries each service's
# health-check results, and the table leaves them out. The brief asks for them
# to be added, so the change adds something to the tool's terminal output and
# raises "where does it go" (a column, a marker, a section under the table),
# but it puts nothing on a page: the repo has no HTML, no web server, and no UI
# code of any kind.
#
# This is the over-trigger counterpart of
# brainstorming-bounded-companion-after-compaction. That scenario measures
# whether brainstorming opens the visual companion when a feature adds
# controls to a web page. A trigger keyed on "adding or moving something on a
# page or screen" could also read a terminal as a screen. The companion
# guide's own rule puts text and tabular content in the terminal, so here the
# companion should stay closed, and any candidate outputs belong in chat as
# text.
#
# Small on purpose: about 2k tokens of code and docs, so a session reaches its
# first question well inside Claude Code's default window and never compacts.
#
# Regenerated deterministically on every run; nothing here is random.

setup-helpers run create_base_repo

git rm -q src/index.js src/utils.js
mkdir -p bin src data test

cat > package.json <<'JSON'
{
  "name": "svc",
  "version": "0.4.0",
  "description": "Command-line status for the services we run",
  "private": true,
  "bin": {
    "svc": "bin/svc.js"
  },
  "scripts": {
    "test": "node --test"
  }
}
JSON

cat > README.md <<'MD'
# svc

Command-line status for the services we run. `svc` reads the snapshot the
deploy pipeline writes to `data/services.json` every minute; it never talks to
the services itself.

## Usage

    node bin/svc.js status
    node bin/svc.js status --data path/to/snapshot.json

## Snapshot format

The snapshot names its `environment` and when it was taken (`generatedAt`).
Each entry in `services` has:

- `name` and `version`;
- `replicas`: `ready` and `desired` counts;
- `deployedAt`: when the running version was deployed;
- `health`: when the checks last ran (`checkedAt`) and the result of each
  check (`checks`, each with a `name`, a `status` of `passing` or `failing`,
  and a `detail` when it is failing).

## Tests

    npm test
MD

cat > bin/svc.js <<'JS'
#!/usr/bin/env node
// Entry point. `svc status` prints the latest snapshot as a table.
const { loadServices } = require('../src/load');
const { formatStatus } = require('../src/status');

const USAGE = 'usage: svc status [--data <file>]';

function main(argv) {
  const [command, ...rest] = argv;
  if (command !== 'status') {
    console.error(USAGE);
    return 2;
  }
  let file;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--data' && i + 1 < rest.length) {
      i += 1;
      file = rest[i];
    } else {
      console.error(USAGE);
      return 2;
    }
  }
  process.stdout.write(formatStatus(loadServices(file)));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
JS
chmod +x bin/svc.js

cat > src/load.js <<'JS'
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_FILE = path.join(__dirname, '..', 'data', 'services.json');

// The deploy pipeline owns the snapshot; svc only ever reads it.
function loadServices(file = DEFAULT_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { loadServices, DEFAULT_FILE };
JS

cat > src/status.js <<'JS'
// Renders a snapshot as a fixed-width table, one row per service, in the order
// the snapshot lists them.
const COLUMNS = [
  { title: 'SERVICE', value: (s) => s.name },
  { title: 'VERSION', value: (s) => s.version },
  { title: 'READY', value: (s) => `${s.replicas.ready}/${s.replicas.desired}` },
  { title: 'DEPLOYED', value: (s) => formatTime(s.deployedAt) },
];

const GAP = '   ';

function formatTime(iso) {
  return iso.slice(0, 16).replace('T', ' ');
}

function formatStatus(snapshot) {
  const rows = snapshot.services.map((s) => COLUMNS.map((c) => c.value(s)));
  const widths = COLUMNS.map((c, i) =>
    Math.max(c.title.length, ...rows.map((row) => row[i].length)),
  );
  // The last column is not padded, so no line ends in spaces.
  const line = (cells) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i])))
      .join(GAP);
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ` +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  return [heading, '', line(COLUMNS.map((c) => c.title)), ...rows.map(line), ''].join('\n');
}

module.exports = { formatStatus, formatTime };
JS

cat > test/status.test.js <<'JS'
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
      'SERVICE   VERSION   READY   DEPLOYED',
      'auth      1.8.0     2/2     2026-09-30 07:15',
      'billing   4.2.3     2/3     2026-09-28 17:40',
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
JS

cat > data/services.json <<'JSON'
{
  "environment": "production",
  "generatedAt": "2026-09-30T08:12:05Z",
  "services": [
    {
      "name": "api-gateway",
      "version": "2.14.1",
      "replicas": { "ready": 3, "desired": 3 },
      "deployedAt": "2026-09-29T14:02:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" },
          { "name": "upstreams", "status": "passing" }
        ]
      }
    },
    {
      "name": "auth",
      "version": "1.8.0",
      "replicas": { "ready": 2, "desired": 2 },
      "deployedAt": "2026-09-30T07:15:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" },
          { "name": "token-signing", "status": "passing" }
        ]
      }
    },
    {
      "name": "billing",
      "version": "4.2.3",
      "replicas": { "ready": 2, "desired": 3 },
      "deployedAt": "2026-09-28T17:40:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" },
          { "name": "db-connection", "status": "failing", "detail": "timeout after 5s" }
        ]
      }
    },
    {
      "name": "catalog",
      "version": "3.0.7",
      "replicas": { "ready": 4, "desired": 4 },
      "deployedAt": "2026-09-25T11:30:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" },
          { "name": "cache", "status": "passing" }
        ]
      }
    },
    {
      "name": "checkout",
      "version": "5.1.0",
      "replicas": { "ready": 3, "desired": 3 },
      "deployedAt": "2026-09-29T16:45:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" },
          { "name": "payments-api", "status": "passing" }
        ]
      }
    },
    {
      "name": "image-resizer",
      "version": "0.9.12",
      "replicas": { "ready": 2, "desired": 2 },
      "deployedAt": "2026-09-22T09:05:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" }
        ]
      }
    },
    {
      "name": "notifications",
      "version": "2.3.4",
      "replicas": { "ready": 2, "desired": 2 },
      "deployedAt": "2026-09-27T13:20:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" },
          { "name": "queue-depth", "status": "failing", "detail": "12408 messages waiting" }
        ]
      }
    },
    {
      "name": "search",
      "version": "1.12.0",
      "replicas": { "ready": 2, "desired": 3 },
      "deployedAt": "2026-09-29T10:10:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" },
          { "name": "disk-space", "status": "failing", "detail": "91% used" },
          { "name": "index-freshness", "status": "failing", "detail": "last update 47 min ago" }
        ]
      }
    },
    {
      "name": "sessions",
      "version": "1.4.2",
      "replicas": { "ready": 3, "desired": 3 },
      "deployedAt": "2026-09-26T08:00:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" },
          { "name": "redis", "status": "passing" }
        ]
      }
    },
    {
      "name": "webhooks",
      "version": "0.6.3",
      "replicas": { "ready": 1, "desired": 1 },
      "deployedAt": "2026-09-30T06:55:00Z",
      "health": {
        "checkedAt": "2026-09-30T08:11:40Z",
        "checks": [
          { "name": "http", "status": "passing" }
        ]
      }
    }
  ]
}
JSON

git add package.json README.md bin src data test
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Add svc status"

git checkout -q -b feature/status-health
