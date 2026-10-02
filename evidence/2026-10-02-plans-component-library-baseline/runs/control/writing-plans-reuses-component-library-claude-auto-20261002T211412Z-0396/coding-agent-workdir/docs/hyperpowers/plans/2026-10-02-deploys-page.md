# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips, durations and an empty state, linked from the nav after "Services".

**Architecture:** A new page module `src/pages/deploys.js` exports a pure `renderDeploys(snapshot, query)` that builds the page entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`). `dataTable` already sorts rows, renders sortable header links with `aria-sort`, and swaps in the empty content, so the page itself only validates the query and maps the domain onto those components. `src/server.js` gets one `ROUTES` entry, so the existing snapshot-read/503 path applies unchanged, and `src/layout.js` gets one `NAV` entry.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; nav label is "Deploys", placed directly after "Services".
- Read-only. Out of scope: deploy details page, pagination, live refresh, any action on a deploy.
- Snapshot is `data/deploys.json`: `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`. `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: dropdown with "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started can be sorted both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` in minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: when the filter matches nothing, show "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Tests use `node --test`.
- No new dependencies (`README.md:12`: "No dependencies; Node 20 or later").
- Do not edit `src/ui/` (`src/ui/index.js:1-2`: "Keep local edits small so template updates still apply"). The plan needs no changes there.

### Decisions this plan makes where the spec is silent

- **Query values:** `sort` is `service` or `startedAt`; `dir` is `asc` or `desc`. The default is `sort=startedAt&dir=desc`. Each value falls back on its own, so `?sort=service&dir=bogus` gives service descending.
- **"All environments"** uses option value `""`. `filterBar` drops empty kept values and the page treats `env=""` as "all", so choosing it reloads with `?env=&sort=…&dir=…`.
- **Sort links** are absolute, `/deploys?env=staging&sort=service&dir=asc`, and leave out `env` when it is "all".
- **Started column** shows the raw ISO `startedAt`, the same way the Services page shows `deployedAt`. Sorting compares those ISO strings, which order correctly.
- **Durations under a minute** show as `0m 45s`, keeping the "Xm Ys" shape.
- **Empty state with "All environments"** (only reachable with an empty snapshot) shows "No deploys".

## Grounding

- Page module shape and component-library use: `src/pages/overview.js:1-24` imports from `../ui/index.js`, uses `pageHeader({ title, subtitle: \`Snapshot ${snapshot.generatedAt}\` })` and `statusChip(label, tone)` with the tone mapped at the call site.
- **Do not mirror `src/pages/services.js`.** It predates use of the library and hand-rolls its select, table, `.pill` chips and `escapeHtml`. Copy its query-validation idiom only (`src/pages/services.js:3-7`: an allow-list array, then `includes(...) ? value : default`).
- Filter form: `src/ui/filter-bar.js:15-21` (`keep` → hidden inputs, empty values dropped) plus `src/ui/select.js:13-21` (`data-autosubmit`; `public/harbor.js:1-5` submits on change). No inline `onchange`.
- Sorting, sort links, empty swap: `src/ui/table.js:20-69`. `sort` is `{ key, dir }`, `sortHref(key, nextDir)` builds the link (escaped by the table), and `empty` replaces the table when `rows` is empty. Sorting uses the stable `Array#sort`.
- Chip tones: `src/ui/chip.js:3-15`, where the tones are `ok | warn | bad | info | muted`. The colors are in `public/harbor.css:2,23-27` (`--ok` green, `--warn` amber, `--bad` red, `--info` blue).
- Empty state: `src/ui/empty-state.js:9-12` renders `<p class="ui-empty__title">`.
- Escaping: `src/ui/escape.js:2-9`. `dataTable` escapes plain cells, and `render` output is trusted HTML.
- Routing and 503: `src/server.js:14-39`. `ROUTES` maps path → `{ title, snapshot, render }`, and any `readSnapshot` throw (missing file or bad JSON) becomes the 503 page.
- Nav: `src/layout.js:3-6` (`NAV` array; the active link gets `aria-current="page"`).
- Error handling: none of its own. Page renderers are pure and trust the snapshot shape; the server owns read failures (`src/server.js:27-37`).
- Naming: `render<Page>(snapshot, query)` exported from `src/pages/<page>.js` (`src/pages/services.js:5`), with constants in `UPPER_SNAKE` (`src/pages/services.js:3`).
- Page test shape: `test/pages/services.test.js:1-37`. An inline `snapshot` fixture, `renderX(snapshot, query)`, `assert.match` on HTML fragments, and row order checked with `indexOf('<td>…</td>')`.
- Server test shape: `test/server.test.js:1-29` calls `handle(url, { dataDir })` and asserts `status` and `body`.
- Temp-dir fixtures: none, there is no existing pattern. Task 2 adds the first, using `node:fs/promises` `mkdtemp` + `writeFile` under `os.tmpdir()`.

---

### Task 1: Deploys page renderer

**Risk tier:** standard (new module with query handling and several spec behaviors, all through the shared component library)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js`: `dataTable`, `emptyState`, `filterBar`, `pageHeader`, `selectField`, `statusChip` (signatures as in the Grounding citations).
- Produces:
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`, returning the page body HTML (no layout).
  - `formatDuration(startedAt: string, finishedAt: string | null): string`, returning `"4m 12s"` or `"running"`.

**Mirror:** `src/pages/overview.js:1-24` for imports and the header/chip usage. `test/pages/services.test.js:1-37` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in newest-first order, so the default sort is observable.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-0', service: 'api', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:09:12Z', author: 'dana' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
  ],
};

// Asserts the service cells appear in this order.
function assertOrder(html, services) {
  const positions = services.map((s) => html.indexOf(`<td>${s}</td>`));
  assert.ok(positions.every((p) => p !== -1), `missing a row in ${services}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists newest deploys first by default', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['search', 'notifications', 'billing', 'api']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
});

test('sorts by started oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(html, ['api', 'billing', 'notifications', 'search']);
});

test('sorts by service both ways', () => {
  assertOrder(renderDeploys(snapshot, { sort: 'service', dir: 'asc' }), ['api', 'billing', 'notifications', 'search']);
  assertOrder(renderDeploys(snapshot, { sort: 'service', dir: 'desc' }), ['search', 'notifications', 'billing', 'api']);
});

test('filters by environment and keeps the current sort', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  assertOrder(html, ['api', 'notifications']);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(renderDeploys(snapshot, {}), /href="\/deploys\?sort=service&amp;dir=asc"/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows durations, and running for an in-progress deploy', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('formatDuration pads nothing and keeps zero minutes', () => {
  assert.equal(formatDuration('2026-10-01T09:00:00Z', '2026-10-01T09:04:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T09:00:00Z', '2026-10-01T09:00:45Z'), '0m 45s');
  assert.equal(formatDuration('2026-10-01T09:00:00Z', null), 'running');
});

test('names the environment when the filter matches nothing', () => {
  const production = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(production, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'up' });
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assertOrder(html, ['search', 'notifications', 'billing', 'api']);
  assert.match(html, /<th aria-sort="descending">/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
const SORT_KEYS = ['service', 'startedAt'];
const DIRS = ['asc', 'desc'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = {
    key: SORT_KEYS.includes(query.sort) ? query.sort : 'startedAt',
    dir: DIRS.includes(query.dir) ? query.dir : 'desc',
  };
  const deploys = env
    ? snapshot.deploys.filter((d) => d.environment === env)
    : snapshot.deploys;

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
        value: env,
      }),
    ],
    keep: { sort: sort.key, dir: sort.dir },
  });

  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true },
      {
        key: 'duration',
        label: 'Duration',
        render: (d) => formatDuration(d.startedAt, d.finishedAt),
      },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort,
    sortHref: (key, dir) => {
      const params = new URLSearchParams(env ? { env } : {});
      params.set('sort', key);
      params.set('dir', dir);
      return `/deploys?${params}`;
    },
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s" from two ISO timestamps; "running" while the deploy has no finish.
export function formatDuration(startedAt, finishedAt) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- Do not add CSS. The `ui-*` classes are already styled in `public/harbor.css`. Do not reuse `.pill`/`.services` from `public/app.css`, which belong to the older Services page.
- Do not touch `src/pages/services.js`. Moving it onto the library is a separate change.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 11 tests.

Then run `npm test`.
Expected: PASS, 30 tests (19 existing + 11 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route `/deploys` and add it to the nav

**Risk tier:** standard (multi-file integration touching the router and the shared layout)

**Files:**
- Modify: `src/server.js:7` (import) and `src/server.js:14-17` (`ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page, or 503 "Snapshot unavailable" when `deploys.json` is missing or unreadable. Nav link `<a href="/deploys">Deploys</a>` after Services.

**Mirror:** `src/server.js:14-17` (route entry shape). `test/server.test.js:6-19` (route and 503 tests).

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, replace the import block at the top (lines 1-4) with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Append to the end of the file:

```js

test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, />Services<\/a><a href="\/deploys" aria-current="page">Deploys</);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>notifications<\/td>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'services.json'), '{"generatedAt":"x","services":[]}');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:3');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(The "missing" test writes a valid `services.json` next to the absent `deploys.json`. That shows the route reads its own snapshot, not just any file in the directory.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The three new tests get status `404` instead of `200`/`503`; the four existing tests still pass.

- [ ] **Step 3: Add the route and nav entry**

In `src/server.js`, add the import above the `renderOverview` import (keeping alphabetical order):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after `/services` so `ROUTES` reads:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

In `src/layout.js`, make `NAV`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

No change to `handle`. Its existing `try/catch` around `readSnapshot` already turns a missing file or bad JSON into the 503 page.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 33 tests (30 after Task 1 + 3 new).

Optional manual check: `npm start`, open `http://localhost:3000/deploys`, change the Environment dropdown (the page reloads with `?env=` and keeps `sort`/`dir`), and click the Service and Started headers.

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and link it from the nav"
```

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| `/deploys` route, read-only | 2 |
| "Deploys" nav link after "Services" | 2 |
| Header + snapshot time | 1 (`shows the header…`) |
| Env filter, default "All environments", keeps sort | 1 (`filters by environment…`, `falls back…`) |
| Seven columns, newest first by default | 1 (`lists newest deploys first…`) |
| Service / Started sortable both ways, keeps filter | 1 (`sorts by service…`, `sorts by started…`, `sort links keep the filter`) |
| Status chip colors | 1 (`colors each status`) |
| Duration "4m 12s" / "running" | 1 (`shows durations…`, `formatDuration…`) |
| Empty state naming the environment | 1 (`names the environment…`) |
| 503 on missing/unreadable snapshot | 2 (two 503 tests) |
| Unknown `env`/`sort`/`dir` → default | 1 (`falls back to the defaults…`) |
