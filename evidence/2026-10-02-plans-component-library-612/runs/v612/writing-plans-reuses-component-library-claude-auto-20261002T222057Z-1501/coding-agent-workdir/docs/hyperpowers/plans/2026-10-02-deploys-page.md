# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, sorting by Service and Started, colored status chips, durations and an empty state, linked from the nav after "Services".

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`, the same signature as the existing pages, and builds the page **from the vendored component library in `src/ui/`**: `pageHeader`, `filterBar` + `selectField`, `dataTable` (which already sorts rows and builds sort-header links), `statusChip` and `emptyState`. `src/server.js` gets one `ROUTES` entry. That entry reuses the existing snapshot read and the 503 "Snapshot unavailable" path unchanged. `src/layout.js` gets one `NAV` entry.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Node 20 or later (`"engines": { "node": ">=20" }`); no dependencies. Do not add any packages.
- Tests run with `node --test` (`npm test`), like the rest of the repository.
- Route is `/deploys`; the nav link label is "Deploys" and it goes after "Services".
- The page is read-only. Out of scope: a deploy details page, pagination, live refresh, and any action on a deploy.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. Chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration is `finishedAt` minus `startedAt` in minutes and seconds, such as "4m 12s". An in-progress deploy (`finishedAt: null`) shows "running".
- Filter dropdown options: "All environments" (the default), "production", "staging". It reloads with `?env=` and keeps the current sort.
- Sorting: `?sort=` and `?dir=`, Service and Started both ways. Newest first by default. Changing the sort keeps the filter.
- Empty state text: "No deploys in staging" (naming the chosen environment), shown in place of the table.
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages. An unknown `env`, `sort` or `dir` value falls back to the default.
- **Reuse `src/ui/`; do not hand-roll markup it already provides.** `src/pages/services.js` builds its own `<table>`, `<select>` and `.pill` chips. That predates the component library and is not the pattern to copy. Do not edit `src/ui/*` either: `src/ui/index.js` says to keep local edits small so template updates still apply, and nothing in this plan needs a change there. No `public/app.css` changes are needed, because `public/harbor.css` already styles `.ui-table`, `.ui-filter-bar`, `.ui-chip--*` and `.ui-empty`.

## Decisions the spec leaves open

These are judgment calls made in this plan. Review them before executing.

1. **Chip tones.** The library's `statusChip` tones map to the spec's colors through the `harbor.css` variables: `ok` (#1a7f37, green) for succeeded, `bad` (#cf222e, red) for failed, `warn` (#9a6700, amber) for rolled-back, `info` (#0969da, blue) for in-progress. An unrecognized status falls through to `muted` (gray), which is `statusChip`'s own fallback.
2. **Query values.** `sort` accepts `service` or `startedAt`, and `dir` accepts `asc` or `desc`. Each sortable column has a starting direction: Service starts `asc`, Started starts `desc`. An unknown `sort` resets to Started/desc and ignores any `dir` that came with it. An unknown `dir` with a known `sort` uses that column's starting direction. An unknown `env` means all environments.
3. **Clicking a header.** `dataTable` already handles header links: clicking an inactive header sorts `asc`, and clicking the active one flips its direction. So from the default view, clicking "Started" shows oldest first and clicking again returns to newest first. That covers "both ways" without changing the vendored component.
4. **Ties under the Service sort.** Rows are put in newest-first order before `dataTable` sorts them. `Array.prototype.sort` is stable, so deploys of the same service stay newest first in both Service directions.
5. **Started column** shows the raw ISO timestamp, and the header subtitle reads `Snapshot <generatedAt>`. This matches how the overview and services pages show times today.
6. **Empty snapshot with no filter.** The spec only defines the filtered empty state. With "All environments" selected and zero deploys, the page says "No deploys".
7. **Durations of an hour or more** stay in minutes and seconds ("75m 0s"), as the spec says.

## File Structure

- Create: `src/pages/deploys.js`. Renders the page from a snapshot and the query (`renderDeploys`) and formats durations (`formatDuration`).
- Create: `test/pages/deploys.test.js`. Rendering tests for the page.
- Modify: `src/server.js`. Imports the page and adds the `/deploys` route.
- Modify: `src/layout.js`. Adds the "Deploys" nav entry after "Services".
- Modify: `test/server.test.js`. Adds tests for the route and its 503.

---

### Task 1: Deploys page renderer

**Risk tier:** standard (new module that parses untrusted query values and renders snapshot text into HTML)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, from `src/ui/index.js`, do not modify):
  - `pageHeader({ title: string, subtitle?: string, actions?: string }): string`
  - `filterBar({ action: string, fields: string[], keep?: Record<string, string | undefined> }): string`. Renders `keep` as hidden inputs and skips empty values.
  - `selectField({ name: string, label: string, options: Array<{ value: string, label: string }>, value?: string }): string`. Marked `data-autosubmit`; `public/harbor.js` submits the form on change.
  - `dataTable({ columns, rows, sort?: { key, dir: 'asc' | 'desc' }, sortHref?: (key, dir) => string, empty?: string }): string`. Sorts `rows` by `sort`, escapes cells unless a column has `render`, and returns `empty` instead of a table when `rows` is empty.
  - `statusChip(label: string, tone?: 'ok' | 'warn' | 'bad' | 'info' | 'muted'): string`
  - `emptyState({ title: string, body?: string }): string`
- Produces:
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`. Returns the page body HTML; the server wraps it in `layout`.
  - `formatDuration(startedAt: string, finishedAt: string | null): string`
  - where `Deploy = { id, service, version, environment, status, startedAt, finishedAt: string | null, author }`

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
  ],
};

// Row order as the list of versions, which are unique in the fixture.
function versions(html) {
  return [...html.matchAll(/<td>([\d.]+(?:-rc\.\d+)?)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists every deploy newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th><th>Environment<\/th><th>Status<\/th>/);
  assert.match(html, /<th>Duration<\/th><th>Author<\/th>/);
});

test('sorts by service both ways, newest first within a service', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(versions(asc), ['2.9.0-rc.3', '0.9.4', '0.9.3', '1.23.0-rc.1']);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(versions(desc), ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(desc, /<th aria-sort="descending"><a href="\/deploys\?sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(versions(html), ['2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1']);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows how long each deploy took', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('formats durations in minutes and seconds', () => {
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:50:09Z'), '0m 9s');
  assert.equal(formatDuration('2026-10-01T08:00:00Z', '2026-10-01T09:15:00Z'), '75m 0s');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
});

test('filters by environment and keeps the sort', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.deepEqual(versions(html), ['0.9.4', '0.9.3']);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="">All environments<\/option>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('keeps the filter in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when no deploys match', () => {
  const html = renderDeploys({ ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') }, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('falls back to the column direction for an unknown dir', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.deepEqual(versions(html), ['2.9.0-rc.3', '0.9.4', '0.9.3', '1.23.0-rc.1']);
});

test('ignores a dir that comes without a known sort', () => {
  const html = renderDeploys(snapshot, { sort: 'author', dir: 'asc' });
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
});

test('escapes snapshot text', () => {
  const html = renderDeploys({ ...snapshot, deploys: [{ ...snapshot.deploys[1], author: '<img src=x>' }] }, {});
  assert.match(html, /<td>&lt;img src=x&gt;<\/td>/);
  assert.doesNotMatch(html, /<img src=x>/);
});
```

Notes for the implementer:
- The fixture is deliberately **not** all in newest-first order under every sort. The oldest-first test is what proves the page sorts by start time and does not just echo the snapshot order.
- `versions()` picks out version cells by their shape. Service names, authors and timestamps never match it.

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
// Sortable columns and the direction each starts in.
const SORTS = { service: 'asc', startedAt: 'desc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const known = Object.hasOwn(SORTS, query.sort);
  const sort = known ? query.sort : 'startedAt';
  const dir = known && (query.dir === 'asc' || query.dir === 'desc') ? query.dir : SORTS[sort];

  // Newest first before the table sorts, so deploys of the same service stay
  // newest first under the service sort.
  const rows = snapshot.deploys
    .filter((d) => !env || d.environment === env)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const envField = selectField({
    name: 'env',
    label: 'Environment',
    options: [
      { value: '', label: 'All environments' },
      ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
    ],
    value: env,
  });

  const table = dataTable({
    columns: COLUMNS,
    rows,
    sort: { key: sort, dir },
    sortHref: (key, next) =>
      `/deploys?${new URLSearchParams({ ...(env && { env }), sort: key, dir: next })}`,
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filterBar({ action: '/deploys', fields: [envField], keep: { sort, dir } })}
${table}`;
}

// "4m 12s" from two ISO timestamps; "running" until the deploy finishes.
export function formatDuration(startedAt, finishedAt) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Why it is shaped this way (keep it so in review):
- `.filter()` returns a new array, so the `.sort()` after it never mutates the snapshot.
- The "All environments" option has value `''`. Submitting it sends `?env=`, and `''` is not a known environment, so it falls back to all. The sort links leave `env` out entirely when no filter is set.
- `formatDuration` returns only digits and fixed words, so returning it from a `render` (which `dataTable` treats as trusted HTML) is safe. Every other text cell goes through `dataTable`'s default escaping, and `statusChip` escapes its label.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 14 tests, 0 failures.

Then run: `npm test`
Expected: PASS, 33 tests (19 existing + 14 new), 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: `/deploys` route and nav link

**Risk tier:** standard (multi-file integration: router, shared layout and server tests)

**Files:**
- Modify: `src/server.js` (imports, and the `ROUTES` table)
- Modify: `src/layout.js` (`NAV`)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1). Existing: `readSnapshot('deploys', dataDir)` reads `data/deploys.json`, and `handle(url, { dataDir })` returns `{ status, type, body }`.
- Produces: `GET /deploys` → 200 page inside the layout. An unreadable snapshot → 503 with the "Snapshot unavailable" header. The nav shows "Deploys" after "Services".

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js` (the imports it needs, `assert`, `test`, `fileURLToPath` and `handle`, are already at the top of the file):

```js

test('renders the deploys page from the deploys snapshot', async () => {
  const res = await handle('/deploys?env=staging&sort=service&dir=asc');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>billing<\/td>/);
  assert.doesNotMatch(res.body, /<td>production<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot unavailable/);
});
```

The first test runs against the real `data/deploys.json`, which has staging deploys of `billing`. The staging filter must remove every production row.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the two new tests FAIL. `/deploys` has no route yet, so it answers 404 (`404 !== 200` and `404 !== 503`). The 4 existing tests still pass.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import, keeping the page imports in alphabetical order:

```js
import { layout } from './layout.js';
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
```

and add the route after `/services`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

Change nothing else in `handle`. The existing `try/catch` around `readSnapshot` already produces the 503 page, with `route.title` as the heading.

In `src/layout.js`, add the nav entry after Services:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 35 tests, 0 failures.

- [ ] **Step 5: Check it in the running app**

Run `npm start` and open these URLs:
- `http://localhost:3000/deploys`: 10 rows, newest first. Chips are colored. `search` 1.23.0-rc.1 shows "running". "Deploys" is underlined in the nav.
- Choose "staging" in the dropdown. The page reloads at `/deploys?env=staging&sort=startedAt&dir=desc` with staging rows only.
- Click "Service". The URL keeps `env=staging` and the rows are A→Z. Click it again and they are Z→A.
- `http://localhost:3000/deploys?env=moon&sort=x&dir=y` shows the default view.

Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Serve the deploys page and link it from the nav"
```

---

## Spec Coverage

| Spec requirement | Where |
|---|---|
| `/deploys` route, "Deploys" nav link after "Services" | Task 2 |
| Header "Deploys" + snapshot time | Task 1 (`shows the header…`) |
| Env filter: All environments / production / staging, `?env=`, keeps sort | Task 1 (`filters by environment and keeps the sort`) |
| Columns Service, Version, Environment, Status, Started, Duration, Author; newest first | Task 1 (`lists every deploy newest first by default`) |
| Service and Started sortable both ways via `?sort=`/`?dir=`; sort keeps filter | Task 1 (`sorts by service…`, `sorts by start time…`, `keeps the filter in the sort links`) |
| Status chip colors | Task 1 (`colors each status`), Decision 1 |
| Duration "4m 12s" / "running" | Task 1 (`shows how long…`, `formats durations…`) |
| Empty state "No deploys in staging" in place of the table | Task 1 (`names the environment…`) |
| 503 "Snapshot unavailable" | Task 2 (`answers 503…`) |
| Unknown `env`/`sort`/`dir` fall back to default | Task 1 (three fallback tests), Decision 2 |
| `node --test` rendering + server tests | Tasks 1 and 2 |
