# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, filterable by environment and sortable by service or start time, with colored status chips and durations.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` with the same signature as the other pages. It is built from the vendored Keel kit components (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge`, `emptyState`) instead of hand-written markup like `src/pages/services.js`. The kit already implements the Services page's behavior (sort-header links that flip direction, filter form that keeps the sort, auto-submit select) and has a blue chip tone that `public/app.css`'s `.pill` classes lack. `src/server.js` gets a route and `src/layout.js` a nav entry.

**Tech Stack:** Node 20+, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json` (e.g. `import { dataTable } from '#kit/table'`).

## Global Constraints

- Route is `/deploys`; the nav link label is "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot is `data/deploys.json` (`{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`), read through the existing `readSnapshot('deploys', dataDir)`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: dropdown with "All environments" (default), "production", "staging"; choosing one reloads with `?env=` and keeps the current sort.
- Table columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages (already handled generically by `handle()` in `src/server.js`).
- Unknown `env`, `sort` or `dir` falls back to the default (`env` → all, `sort` → `startedAt`, `dir` → `desc`).
- Tests use `node --test`; run the whole suite with `npm test`.
- Do not edit anything under `vendor/kit/` or `public/kit.*` — it is the vendored admin template.

## Decisions the spec leaves open

- **Query keys.** The sort keys are the snapshot field names, `service` and `startedAt`, matching how Services uses `deployedAt`.
- **Default direction is independent of sort.** An unknown or missing `dir` becomes `desc` regardless of `sort`. The kit's header links always carry an explicit `dir`, so this only affects hand-typed URLs.
- **Empty with no filter.** If the snapshot itself is empty and the filter is "all", the page says "No deploys". The spec only defines the filtered message.
- **Started is shown as the raw ISO timestamp**, like Services shows `deployedAt`.
- **Duration over an hour** stays in minutes ("84m 5s"), as the spec defines the format as minutes and seconds.
- **Ties when sorting by Service** keep snapshot order (the kit's sort is stable; the pipeline writes newest first).

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query validation, filtering, and page HTML from kit components; private `duration(deploy)` helper. |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, default order and columns, both sorts, filter, chips, durations, empty state, unknown-value fallback. |
| `src/server.js` | Modify | Import `renderDeploys`; add the `/deploys` route. |
| `src/layout.js` | Modify | Add `{ href: '/deploys', label: 'Deploys' }` to `NAV` after Services. |
| `test/server.test.js` | Modify | Route renders in the layout; `/deploys` in the every-page loop; 503 for `/deploys`. |
| `README.md` | Modify | Add Deploys to the page list. |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module with filtering, sorting and formatting logic. Not a pure transcription even though the code is in the plan.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (vendored kit, exact signatures):
  - `pageHeader({ title, subtitle? })` → `<header class="kit-page-header"><div><h1>…</h1><p class="kit-muted">…</p></div></header>`
  - `selectField({ name, label, options: [{value,label}], value })` → `<label class="kit-field">…<select name="…" class="kit-select" data-autosubmit><option value="x" selected>…</option>…</select></label>`
  - `filterBar({ action, fields: string[], keep: Record<string,string> })` → `<form class="kit-filter-bar" method="get" action="…">…<input type="hidden" name="k" value="v">…</form>`
  - `dataTable({ columns: [{key,label,sortable?,render?,value?}], rows, sort: {key,dir}, sortHref: (key, dir) => string, empty })`: sorts rows by `sort`, renders `<th aria-sort="descending"><a href="…">Started ▼</a></th>` for the active sortable column (link carries the flipped dir) and `<th><a href="…">Service</a></th>` for an inactive one (link dir `asc`). Plain cells are `<td>escaped</td>`. Columns are joined with no whitespace. Returns `empty` verbatim when `rows` is empty.
  - `badge(label, tone)` with tone `'ok' | 'bad' | 'warn' | 'info' | 'muted'` → `<span class="kit-badge kit-badge--<tone>">label</span>`. In `public/kit.css`: ok green `#1a7f37`, bad red `#cf222e`, warn amber `#9a6700`, info blue `#0969da`.
  - `emptyState({ title })` → `<div class="kit-empty"><p class="kit-empty__title">…</p></div>`
- Produces: `export function renderDeploys(snapshot, query)` in `src/pages/deploys.js`. `snapshot` is the parsed `deploys.json`; `query` is a plain object of query-string values (`Object.fromEntries(searchParams)`). Returns the page body HTML string. Task 2 imports it.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Versions are unique per row, so row order is checked by version cell.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
  ],
};

function inOrder(html, ...cells) {
  const positions = cells.map((c) => html.indexOf(`<td>${c}</td>`));
  assert.ok(positions.every((p) => p !== -1), `missing one of ${cells.join(', ')}`);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), `expected order ${cells.join(', ')}`);
}

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default, with the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  inOrder(html, '1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3');
  assert.match(
    html,
    /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th>/,
  );
  assert.match(html, /<td>priya<\/td>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  inOrder(asc, 'billing', 'notifications', 'search');
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(asc, /<input type="hidden" name="sort" value="service">/);
  assert.match(asc, /<input type="hidden" name="dir" value="asc">/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  inOrder(desc, 'search', 'notifications', 'billing');
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  inOrder(html, '2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1');
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>billing<\/td>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  inOrder(html, '1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const STATUS_TONES = new Map([
  ['succeeded', 'ok'],
  ['failed', 'bad'],
  ['rolled-back', 'warn'],
  ['in-progress', 'info'],
]);

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        value: env,
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
      }),
    ],
    keep: { sort, dir },
  });

  // The header links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES.get(d.status)) },
      { key: 'startedAt', label: 'Started', sortable: true },
      { key: 'duration', label: 'Duration', render: duration },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// finishedAt minus startedAt, such as "4m 12s". A deploy still in progress
// has no finishedAt yet.
function duration(deploy) {
  if (deploy.finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `badge` escapes its label and falls back to the `muted` tone for an unknown status (`STATUS_TONES.get` returns `undefined`), so a new pipeline status renders grey instead of crashing.
- `dataTable` escapes plain cells and the `sortHref` result, which is why the tests expect `&amp;` in the hrefs. `render` output is trusted HTML: `duration` returns only digits and fixed words, and `badge` escapes for itself.
- Do not copy `services.js`'s hand-written `<table>`/`.pill` markup. The spec asks for the same *behavior* as Services, and the kit provides it. The kit's `public/kit.js` auto-submits the select, which replaces Services' inline `onchange`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

Then run `npm test`. Expected: every test passes (the existing suites are untouched).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration (server routing, shared layout, README) with server tests.

**Files:**
- Modify: `src/server.js` (imports, `ROUTES`)
- Modify: `src/layout.js` (`NAV`)
- Modify: `README.md` ("Pages" section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from `src/pages/deploys.js` (Task 1); the existing `handle(url, { dataDir })` and `readSnapshot(name, dir)`.
- Produces: `GET /deploys` returns 200 with the page inside the layout, or 503 "Snapshot unavailable" when `deploys.json` can't be read. A "Deploys" nav link appears on every page.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add after the `renders the services page inside the layout` test:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>0\.9\.4<\/td>/);
});
```

Change the path list in `serves every page in the nav` to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Add after `answers 503 when the snapshot cannot be read`:

```js
test('answers 503 on the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`<td>search</td>` and `0.9.4` come from the committed `data/deploys.json`: `search` is a staging deploy and `0.9.4` is a production one.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The new deploys tests and the every-page loop get status 404 instead of 200/503 (`/deploys` is not routed yet).

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical position, between the other page imports:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderIncidents } from './pages/incidents.js';
```

and add the route after `/services`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
```

In `src/layout.js`, add the nav entry after Services:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
```

No 503 code is needed. `handle()` already wraps every route's `readSnapshot` in the "Snapshot unavailable" fallback.

- [ ] **Step 4: Update the README**

In `README.md`, replace the first line of the "Pages" paragraph:

```markdown
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

(the rest of that paragraph is unchanged).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, the whole suite including the 9 deploys page tests and the new server tests.

Optional smoke check: `npm start`, open `http://localhost:3000/deploys`, and confirm that changing the environment dropdown reloads with `?env=` and keeps the sort.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Deploys: route /deploys and link it from the nav"
```
