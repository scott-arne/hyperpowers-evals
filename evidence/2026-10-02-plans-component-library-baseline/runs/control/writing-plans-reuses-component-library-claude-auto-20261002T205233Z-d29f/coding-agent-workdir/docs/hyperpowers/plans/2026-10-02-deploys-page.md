# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, status chips, durations and an empty state.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It is built entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`), the way `src/pages/overview.js` is — **not** by copying the hand-rolled HTML, `.pill` classes and private `escapeHtml` in `src/pages/services.js`, which predates the library. The server gets one new `ROUTES` entry and the nav one new link; the existing 503 path covers the missing-snapshot case unchanged.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; nav label "Deploys", placed after "Services".
- Read-only: no deploy details page, no pagination, no live refresh, no actions on a deploy.
- Header title "Deploys", with the snapshot time under it.
- Environment dropdown options: "All environments" (default), "production", "staging". Query param `env`. Changing it keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (by `startedAt`). Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` − `startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: when the filter matches nothing, show "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` → fall back to the default.
- Tests run with `node --test` (`npm test`). No new dependencies.
- Do not edit `src/ui/` (vendored template: "Keep local edits small so template updates still apply" — `src/ui/index.js:1-2`). Nothing in this plan needs a change there.
- Do not touch `src/pages/services.js` or `public/app.css`; migrating Services onto the library is out of scope.

## Grounding

- Page module shape (render fn taking `(snapshot, query)`, built from `../ui/index.js`, `Snapshot ${generatedAt}` subtitle): `src/pages/overview.js:1-24`.
- Query-param fallback to defaults via an allow-list: `src/pages/services.js:3-7` (the *validation idiom only*; its markup is not the pattern to follow).
- Status chip — map domain state to a tone at the call site: `src/ui/chip.js:3-15`; tones `ok`/`warn`/`bad`/`info` are green/amber/red/blue in `public/harbor.css:2,22-27`; call-site mapping example `src/pages/overview.js:10-13`.
- Filter form that keeps the sort in hidden inputs and auto-submits: `src/ui/filter-bar.js:15-21` + `src/ui/select.js:13-21` + `public/harbor.js:1-5`.
- Sortable table with `?sort=&dir=` links, `aria-sort`, and an `empty` replacement: `src/ui/table.js:20-69`.
- Empty state: `src/ui/empty-state.js:9-12`.
- HTML escaping: `esc` from `src/ui/escape.js:2-9` (cells without `render` are escaped by `dataTable` automatically, `src/ui/table.js:33`).
- Routing, nav, 503: `src/server.js:14-39`, `src/layout.js:3-6`.
- Page test shape (inline snapshot fixture, regex/indexOf assertions on HTML): `test/pages/services.test.js:1-37`, `test/pages/overview.test.js:1-19`.
- Server test shape (`handle(url, { dataDir })`, missing dir for 503): `test/server.test.js:1-19`.
- Naming: camelCase functions, `render<Page>` exports, kebab-case filenames, UPPER_SNAKE module constants (`ENVIRONMENTS`, `ROUTES`, `NAV`).
- Error handling: none in page modules — the server's `try/catch` around `readSnapshot` is the single error path (`src/server.js:26-37`).

## Design decisions (interpretations of the spec)

- **"All environments" option value is `''`.** `selectField` + `filterBar` then submit `?env=`, which is not in the allow-list and so resolves to "all" — same as the default. This matches `test/ui/select.test.js:10`.
- **Sort keys are the snapshot field names:** `sort=service` or `sort=startedAt`. Default `sort=startedAt`.
- **Default `dir` depends on the column:** `desc` for `startedAt` (newest first, per spec), `asc` for `service` (A→Z). An unknown or missing `dir` falls back to that column's default. `dataTable`'s header links always supply an explicit `dir`, so this only matters for hand-typed URLs.
- **Sort links are built with `URLSearchParams`:** they are `/deploys?env=<env>&sort=<key>&dir=<dir>` with `env` omitted when it is "all". The filter bar always keeps `sort` and `dir`.
- **Empty state with "All environments" selected** (only possible if the snapshot has no deploys) reads "No deploys".
- **Duration** rounds to whole seconds and never rolls into hours (a 75-minute deploy is "75m 0s"); a sub-minute one is "0m 30s". Deploys are minutes long in practice; the spec asks for minutes and seconds only.
- **Started** shows the raw ISO timestamp, as Services shows `deployedAt` (`src/pages/services.js:31`); ISO strings sort correctly as strings.

## File Structure

- Create `src/pages/deploys.js` — `renderDeploys(snapshot, query)` plus private helpers `formatDuration`, the status→tone map, and query parsing. One responsibility: render the Deploys page body.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/server.js:7-17` — import and route.
- Modify `src/layout.js:3-6` — nav entry.
- Modify `test/server.test.js` — route + 503 tests.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module with query parsing and sort/filter logic; not a pure transcription.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js` — `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `statusChip(label, tone)`, `emptyState({title})`, `esc(value)`.
- Produces: `export function renderDeploys(snapshot, query): string` where `snapshot = { generatedAt: string, deploys: Deploy[] }`, `query: Record<string,string>` (the route's `Object.fromEntries(searchParams)`), and `Deploy = { id, service, version, environment, status, startedAt, finishedAt: string|null, author }`.

**Mirror:** `src/pages/overview.js:1-24` for module shape and component use; `test/pages/services.test.js` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
  ],
};

// Row order, read from the Version column (versions are unique in the fixture).
function order(html) {
  return [...html.matchAll(/<tr><td>[^<]*<\/td><td>([^<]*)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time and all columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  assert.match(
    html,
    /<thead><tr><th.*>Service.*<\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th.*>Started.*<\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
});

test('sorts by started oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(html), ['2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1']);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(asc.indexOf('<td>billing</td>') < asc.indexOf('<td>notifications</td>'));
  assert.ok(asc.indexOf('<td>notifications</td>') < asc.indexOf('<td>search</td>'));
  assert.match(asc, /<th aria-sort="ascending"><a href="\/deploys\?sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(desc.indexOf('<td>search</td>') < desc.indexOf('<td>billing</td>'));
});

test('filters by environment and keeps the filter in sort links', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'asc' });
  assert.deepEqual(order(html), ['2.9.0-rc.3', '1.23.0-rc.1']);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('keeps the sort when the filter changes', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats durations and shows running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when no deploys match', () => {
  const only = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(only, { env: 'staging' });
  assert.match(html, /<div class="ui-empty"><p class="ui-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.deepEqual(order(html), ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('falls back to ascending for service with an unknown dir', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.ok(html.indexOf('<td>billing</td>') < html.indexOf('<td>search</td>'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { dataTable, emptyState, filterBar, pageHeader, selectField, statusChip } from '../ui/index.js';

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
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

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
    sortHref: (key, next) => {
      const params = new URLSearchParams();
      if (env !== 'all') params.set('env', env);
      params.set('sort', key);
      params.set('dir', next);
      return `/deploys?${params}`;
    },
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s" from startedAt to finishedAt; "running" until the deploy finishes.
function formatDuration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `Object.hasOwn` (not `in`) so inherited keys such as `?sort=toString` fall back to the default.
- `dataTable` escapes cells without `render` and sorts by `row[key]`; ISO timestamps compare correctly as strings, so no `value` function is needed.
- The `render` outputs are trusted HTML: `statusChip` escapes its label, and `formatDuration` returns only digits and fixed text.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 11 tests.

Then run the full suite: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route and nav link

**Risk tier:** low — two small edits whose complete content is in this plan, plus test additions written out verbatim.

**Files:**
- Modify: `src/server.js:7-17`
- Modify: `src/layout.js:3-6`
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); `readSnapshot('deploys', dataDir)` reads `data/deploys.json` (`src/data.js:9-11`).
- Produces: `GET /deploys` → 200 page inside the layout; 503 "Snapshot unavailable" when `deploys.json` cannot be read; nav link "Deploys".

**Mirror:** `test/server.test.js:6-19`.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the two new tests FAIL (status 404 instead of 200/503); the existing four pass.

- [ ] **Step 3: Implement**

In `src/server.js`, add the import after the overview import and the route after `/services`:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
```

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

In `src/layout.js`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests pass (including Task 1's).

Manual check: `npm start`, open `http://localhost:3000/deploys`, change the environment dropdown (page reloads with `?env=`, sort kept), click Service and Started headers (filter kept), confirm chip colors.

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and link it from the nav"
```
