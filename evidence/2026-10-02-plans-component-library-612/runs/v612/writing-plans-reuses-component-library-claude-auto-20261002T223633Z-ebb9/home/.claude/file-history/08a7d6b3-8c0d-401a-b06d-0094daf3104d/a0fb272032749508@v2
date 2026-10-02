# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json` with an environment filter, sortable Service/Started columns, colored status chips and durations.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)` and is built entirely from the vendored Harbor component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`). `src/server.js` gets a `/deploys` route reading the `deploys` snapshot, which gives it the existing 503 "Snapshot unavailable" handling for free; `src/layout.js` gets a nav entry after "Services".

**Tech Stack:** Node ≥20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Node `>=20` (`package.json` `engines`); no new dependencies.
- Tests run with `node --test` (`npm test`); test files live under `test/` and end in `.test.js`.
- Route is exactly `/deploys`; nav label is exactly `Deploys`, placed after `Services`.
- Read-only: no deploy details page, no pagination, no live refresh, no actions.
- `status` values: `succeeded`, `failed`, `rolled-back`, `in-progress`. Chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Filter options: "All environments" (default), "production", "staging"; query param `env`.
- Sort query params `sort` and `dir`; only Service and Started are sortable; default is newest first (Started, descending).
- Duration format: minutes and seconds, e.g. `4m 12s`; in-progress shows `running`.
- Empty filter result text: `No deploys in <environment>` (e.g. `No deploys in staging`), shown instead of the table.
- Unknown `env`, `sort` or `dir` values fall back to the default.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- **Reuse `src/ui/` components; do not edit them.** `src/ui/index.js` says the library is vendored from the template and local edits should stay small. Do not copy the hand-rolled markup/`escapeHtml`/`.pill` style from `src/pages/services.js`, and do not refactor `services.js` (out of scope).

### How the components map to the spec

| Spec item | Component | Notes |
|---|---|---|
| Header + snapshot time | `pageHeader({ title, subtitle })` | Subtitle `Snapshot <generatedAt>`, same as the Overview page. |
| Environment dropdown, keeps sort | `filterBar({ action, fields, keep })` + `selectField(...)` | `selectField` adds `data-autosubmit`; `public/harbor.js` submits the form on change. `keep: { sort, dir }` carries the sort as hidden inputs. "All environments" uses value `''`, which falls back to all. |
| Table, sortable headers, keeps filter | `dataTable({ columns, rows, sort, sortHref, empty })` | `dataTable` sorts rows by `sort` and builds header links via `sortHref(key, nextDir)`; our `sortHref` includes `env`. |
| Status chip | `statusChip(label, tone)` | Tones (from `public/harbor.css`): `ok` green, `bad` red, `warn` amber, `info` blue. |
| Empty state | `emptyState({ title })` passed as `dataTable`'s `empty` | |

### Decisions the spec leaves open (flag in review if you disagree)

- **Default direction per sort:** `startedAt` → `desc` (newest first, per spec); `service` → `asc`. An unknown `dir` falls back to that sort's default direction.
- **Ties when sorting by Service:** rows are pre-sorted newest first before `dataTable` sorts them; `Array.prototype.sort` is stable, so a service's deploys stay newest first in both directions.
- **"Started" cell** shows the raw ISO timestamp, like the Services page's "Deployed" column.
- **Empty with "All environments"** (empty snapshot) shows `No deploys`.
- **Duration** is derived from `finishedAt`: when it is null the cell shows `running`. Seconds are rounded; minutes are not capped at 60 (`75m 3s`).

---

## File Structure

- Create `src/pages/deploys.js` — the page: query parsing/fallback, column definitions, status→tone mapping, duration format, composition of `src/ui` components.
- Create `test/pages/deploys.test.js` — rendering tests for the page.
- Modify `src/server.js` — add the `/deploys` route.
- Modify `src/layout.js` — add the `Deploys` nav item.
- Modify `test/server.test.js` — route, nav and 503 tests.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module composing several components with query-state logic; the plan holds the full content but the sort/filter interplay is worth a Codex look.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js` — `dataTable`, `emptyState`, `filterBar`, `pageHeader`, `selectField`, `statusChip` (signatures as documented in each `src/ui/*.js` JSDoc; do not modify them).
- Produces:
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string` — page body HTML (no layout).
  - `formatDuration(deploy: Deploy): string` — `'running'` or `'<m>m <s>s'`.
  - where `Deploy = { id, service, version, environment, status, startedAt: string, finishedAt: string | null, author }`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in date order, so the default sort is exercised.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-5', service: 'api-gateway', version: '3.15.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'dana' },
  ],
};

// Service names in table row order (Service is the first column).
function order(html) {
  return [...html.matchAll(/<tr><td>([^<]*)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default, with all columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['api-gateway', 'search', 'notifications', 'billing']);
  for (const label of ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']) {
    assert.match(html, new RegExp(`<th[^>]*>(<a [^>]*>)?${label}`));
  }
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Duration<\/th>/);
});

test('sorts by service both ways', () => {
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), [
    'api-gateway',
    'billing',
    'notifications',
    'search',
  ]);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(order(desc), ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(desc, /<th aria-sort="descending"><a href="\/deploys\?sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by started both ways', () => {
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' })), [
    'billing',
    'notifications',
    'search',
    'api-gateway',
  ]);
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' })), [
    'api-gateway',
    'search',
    'notifications',
    'billing',
  ]);
});

test('keeps a service\'s deploys newest first when sorting by service', () => {
  const twice = {
    generatedAt: snapshot.generatedAt,
    deploys: [
      { ...snapshot.deploys[3], id: 'old', version: '1.22.0', startedAt: '2026-09-01T00:00:00Z' },
      { ...snapshot.deploys[3], id: 'new', version: '1.23.0', startedAt: '2026-10-01T08:50:00Z' },
    ],
  };
  const html = renderDeploys(twice, { sort: 'service', dir: 'asc' });
  assert.ok(html.indexOf('<td>1.23.0</td>') < html.indexOf('<td>1.22.0</td>'));
});

test('filters by environment and keeps the sort', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.deepEqual(order(html), ['search', 'notifications']);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="">All environments<\/option>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<option value="staging">staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('colors the status chips', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats durations in minutes and seconds', () => {
  assert.equal(formatDuration(snapshot.deploys[3]), '4m 12s');
  assert.equal(formatDuration(snapshot.deploys[0]), '21m 40s');
  assert.equal(
    formatDuration({ startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:45:45Z' }),
    '0m 45s',
  );
  assert.equal(formatDuration(snapshot.deploys[1]), 'running');
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = {
    generatedAt: snapshot.generatedAt,
    deploys: snapshot.deploys.filter((d) => d.environment === 'production'),
  };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.deepEqual(order(html), ['api-gateway', 'search', 'notifications', 'billing']);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('falls back to ascending for an unknown dir on the service sort', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'up' });
  assert.deepEqual(order(html), ['api-gateway', 'billing', 'notifications', 'search']);
});

test('escapes deploy fields', () => {
  const evil = {
    generatedAt: snapshot.generatedAt,
    deploys: [{ ...snapshot.deploys[3], author: '<script>' }],
  };
  assert.match(renderDeploys(evil, {}), /<td>&lt;script&gt;<\/td>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import {
  dataTable,
  emptyState,
  filterBar,
  pageHeader,
  selectField,
  statusChip,
} from '../ui/index.js';

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { startedAt: 'desc', service: 'asc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: (d) => formatDuration(d) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = query.sort in DEFAULT_DIR ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  // Newest first before the table sorts, so ties on service stay newest first.
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const filter = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [
          { value: '', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
        value: env === 'all' ? '' : env,
      }),
    ],
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => deploysHref(env, key, next),
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s" from start to finish; a deploy without a finish is still running.
export function formatDuration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function deploysHref(env, sort, dir) {
  const params = new URLSearchParams();
  if (env !== 'all') params.set('env', env);
  params.set('sort', sort);
  params.set('dir', dir);
  return `/deploys?${params}`;
}
```

Notes for the implementer:
- `query.sort in DEFAULT_DIR` is safe for `undefined` (`'undefined' in {...}` is `false`), but would accept inherited keys like `toString`. If that bothers the reviewer, use `Object.hasOwn(DEFAULT_DIR, query.sort)` — same behavior for real inputs.
- `dataTable` escapes `sortHref`'s result and every non-`render` cell; `statusChip` escapes its label. No extra escaping is needed here.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 13 tests.

Then run the whole suite: `npm test`
Expected: all tests pass (19 existing + 13 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: `/deploys` route and nav link

**Risk tier:** low — two one-line additions to existing tables in `src/server.js` and `src/layout.js` plus server tests, all written out verbatim in this plan.

**Files:**
- Modify: `src/server.js:8-17` (imports and `ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); `readSnapshot('deploys', dataDir)` already reads `data/deploys.json`.
- Produces: `GET /deploys` → 200 page wrapped in the layout, or 503 "Snapshot unavailable"; nav link `<a href="/deploys">Deploys</a>` after Services.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 for the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(The first test reads the real `data/deploys.json`, which has production `notifications` deploys, the same way the existing Services test reads `data/services.json`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the three new tests FAIL (404 instead of 200/503; no Deploys nav link). The four existing tests still pass.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import after the overview import:

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route to `ROUTES`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests pass (19 existing + 13 from Task 1 + 3 new).

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: the nav shows Deploys after Services and is underlined; the table is newest first with colored chips; choosing "staging" in the dropdown reloads with `?env=staging&sort=startedAt&dir=desc`; clicking "Service" sorts A→Z and keeps `env`; clicking it again sorts Z→A. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and link it in the nav"
```
