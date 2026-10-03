# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`. It can be filtered by environment and sorted by service or start time, shows a colored status chip and a duration for each deploy, and is linked in the nav after "Services".

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`, with the same contract as the other pages. It builds the page from the vendored Keel kit components already in the repo: `pageHeader`, `filterBar` + `selectField`, `dataTable`, `badge` and `emptyState`. It does not copy the Services page's hand-built markup. The kit's `dataTable` already does the sortable headers (links, ▲/▼ arrows, `aria-sort`) and the row sorting. `filterBar` carries the current sort as hidden inputs, and `public/kit.js` auto-submits the select. `src/server.js` gets one route entry, and `src/layout.js` gets one nav entry. The existing 503 path in `handle()` covers a missing or unreadable snapshot without any change.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`. Nav link label `Deploys`, placed directly after `Services`.
- Page header `Deploys`, with the snapshot time under it (rendered as `Snapshot <generatedAt>`, the same wording as the Overview page).
- Environment filter options: `All environments` (default, value `all`), `production`, `staging`. Query param `?env=`. Changing it keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (`sort=startedAt`, `dir=desc`). Sortable columns: Service (`?sort=service`) and Started (`?sort=startedAt`), both directions via `?dir=asc|desc`. Sort links keep the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue. These map to kit badge tones `ok`, `bad`, `warn` and `info`.
- Duration is `finishedAt − startedAt` as `<m>m <s>s`, e.g. `4m 12s`. An in-progress deploy (`finishedAt: null`) shows `running`.
- Empty filter result shows `No deploys in <env>` (e.g. `No deploys in staging`) in place of the table.
- A missing or unreadable `deploys.json` gives the shared 503 "Snapshot unavailable" page. An unknown `env`, `sort` or `dir` falls back to the default (`all`, `startedAt`, `desc`).
- Out of scope: details page, pagination, live refresh, actions on deploys.
- Tests use `node --test`. No new dependencies. Do not edit `vendor/kit/` (it is the vendored template) or refactor `src/pages/services.js`.

### Decisions this plan makes where the spec is silent

- **Started** shows the raw ISO timestamp, the same way the Services page's Deployed column does.
- An unknown `dir` falls back to `desc`, the page's single default, whichever column is sorted.
- Rows are put newest first before the table sorts them. Sorting by Service therefore keeps each service's deploys newest-first, because `Array#sort` is stable.
- If the unfiltered snapshot is empty (`env=all`), the empty state says `No deploys`.
- No `public/app.css` change is needed. `public/kit.css` already styles every kit component used here, and `--kit-ok` / `--kit-bad` / `--kit-warn` / `--kit-info` are green, red, amber and blue.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)` and `formatDuration(startedAt, finishedAt)` |
| `test/pages/deploys.test.js` | Create | Rendering tests for the filter, both sorts, chips, duration, empty state, fallbacks |
| `src/server.js` | Modify | Import `renderDeploys`; add the `/deploys` route |
| `src/layout.js` | Modify | Add the `Deploys` nav entry after `Services` |
| `test/server.test.js` | Modify | Route, nav order, and 503 tests for `/deploys` |
| `README.md` | Modify | List Deploys among the pages |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module built on five kit components; the whole spec's page behavior lives here.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing vendored kit; do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`. Escapes `title` and `subtitle`.
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`. `keep` entries become `<input type="hidden" name="k" value="v">`.
  - `selectField({ name, label, options: {value,label}[], value }) → string` from `#kit/select`. Renders `<select name="…" class="kit-select" data-autosubmit>`.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty? }) → string` from `#kit/table`. Sorts the rows by `sort` (`row[key]` compared with `localeCompare`). `sortHref` output is escaped, so `&` becomes `&amp;`. Returns `empty` in place of the table when `rows` is empty.
  - `badge(label, tone) → string` from `#kit/badge`. Renders `<span class="kit-badge kit-badge--<tone>">label</span>`. An unknown tone becomes `muted`.
  - `emptyState({ title }) → string` from `#kit/empty`. Renders `<div class="kit-empty"><p class="kit-empty__title">title</p></div>`.
- Produces:
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string,string>) → string` (Task 2 routes to it).
  - `formatDuration(startedAt: string, finishedAt: string | null) → string`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately **not** in newest-first order, so the tests prove that the page sorts. Newest first, the versions run `1.23.0-rc.1` (search), `3.1.1` (api), `3.1.0` (api), `2.8.0` (billing).

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'api', version: '3.1.0', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.8.0', environment: 'production', status: 'failed', startedAt: '2026-09-30T10:00:00Z', finishedAt: '2026-09-30T10:02:30Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'api', version: '3.1.1', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Asserts the version cells appear in this order.
function assertOrder(html, versions) {
  const positions = versions.map((v) => html.indexOf(`<td>${v}</td>`));
  positions.forEach((p, i) => assert.ok(p >= 0, `missing ${versions[i]}`));
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i - 1] < positions[i], `${versions[i - 1]} should come before ${versions[i]}`);
  }
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<header class="kit-page-header"><div><h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p><\/div><\/header>/);
});

test('lists deploys newest first by default, with the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['1.23.0-rc.1', '3.1.1', '3.1.0', '2.8.0']);
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<td>priya<\/td>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(oldest, ['2.8.0', '3.1.0', '3.1.1', '1.23.0-rc.1']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways, newest first within a service', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(az, ['3.1.1', '3.1.0', '2.8.0', '1.23.0-rc.1']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(za, ['1.23.0-rc.1', '2.8.0', '3.1.1', '3.1.0']);
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('filters by environment, keeping the sort in the form and the filter in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assertOrder(html, ['2.8.0', '3.1.1', '3.1.0']);
});

test('offers all environments by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<option value="all" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows how long each deploy took, or that it is running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('formats durations in minutes and seconds', () => {
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:50:00Z'), '0m 0s');
  assert.equal(formatDuration('2026-10-01T08:00:00Z', '2026-10-01T09:15:03Z'), '75m 3s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', null), 'running');
});

test('names the environment when the filter matches no deploys', () => {
  const production = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(production, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assertOrder(html, ['1.23.0-rc.1', '3.1.1', '3.1.0', '2.8.0']);
});

test('escapes snapshot text', () => {
  const html = renderDeploys(
    { ...snapshot, deploys: [{ ...snapshot.deploys[0], author: '<script>x</script>' }] },
    {},
  );
  assert.match(html, /<td>&lt;script&gt;x&lt;\/script&gt;<\/td>/);
  assert.doesNotMatch(html, /<script>x/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `src/pages/deploys.js`).

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
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  // Newest first before the table sorts, so a service's deploys stay in that
  // order when sorting by service (the sort is stable).
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

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

  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true },
      { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    // The links carry the filter so sorting keeps it.
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// Minutes and seconds between two ISO timestamps, such as "4m 12s"; "running"
// while the deploy has not finished.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `TONES[d.status]` uses a plain object. An unexpected status such as `constructor` resolves to an inherited function. `badge` rejects any tone that isn't in its own set and falls back to `muted`, so no guard is needed here.
- Every value interpolated into `sortHref` comes from the allowlists above, and `dataTable` escapes the href. `env` in the empty-state title is allowlisted too, and `emptyState` escapes it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 12 tests.

Then run the full suite: `npm test`
Expected: PASS, 30 tests (the 18 existing ones plus 12 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link, and README

**Risk tier:** standard — multi-file integration (server routing, shared layout, docs), though each edit is small.

**Files:**
- Modify: `src/server.js` (imports block, lines 7-12; `ROUTES`, lines 17-23)
- Modify: `src/layout.js` (`NAV`, lines 3-9)
- Modify: `README.md` (the "Pages" section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). Existing: `handle(url, { dataDir }) → { status, type, body }` in `src/server.js`. `readSnapshot('deploys', dir)` reads `data/deploys.json`, which the pipeline commit already added.
- Produces: `GET /deploys` route; `Deploys` nav entry.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `/deploys` to the nav-page loop by replacing the existing test:

```js
test('serves every page in the nav', async () => {
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
    assert.equal((await handle(path)).status, 200, path);
  }
});
```

Then add these tests after `renders the services page inside the layout`. They run against the real `data/deploys.json`, where `search` has a staging deploy and `notifications` is production-only.

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>notifications<\/td>/);
});

test('links Deploys in the nav right after Services', async () => {
  const { body } = await handle('/');
  const services = body.indexOf('<a href="/services">Services</a>');
  const deploys = body.indexOf('<a href="/deploys">Deploys</a>');
  const incidents = body.indexOf('<a href="/incidents">Incidents</a>');
  assert.ok(services >= 0 && services < deploys && deploys < incidents);
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
Expected: FAIL. `serves every page in the nav` fails with `404 !== 200` for `/deploys`; the deploys-page, nav-order and deploys-503 tests fail too, because the route and the link do not exist yet.

- [ ] **Step 3: Add the route and the nav entry**

In `src/server.js`, add the import in alphabetical order with the other page imports:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderIncidents } from './pages/incidents.js';
```

and add the route after `/services` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
```

In `src/layout.js`, add the nav entry after Services:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/oncall', label: 'On-call' },
  { href: '/runbooks', label: 'Runbooks' },
];
```

No change to the 503 handling: `handle()` already catches both a missing file and invalid JSON from `readSnapshot` and returns the shared "Snapshot unavailable" page.

- [ ] **Step 4: Update the README**

In `README.md`, replace the first sentence of the "Pages" section:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
`src/pages/`.
```

(The rest of that paragraph, starting "`src/server.js` routes requests…", stays as is.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 33 tests (30 after Task 1, plus 3 new server tests; the edited nav-loop test is not a new test).

Manual check: run `npm start`, open `http://localhost:3000/deploys`, change the environment dropdown (the page reloads with `?env=` and keeps the sort), click the Service and Started headers, and confirm the chip colors.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Route /deploys and link it in the nav"
```
