# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, linked from the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like the other pages. It is built from the vendored Keel kit components (`pageHeader`, `filterBar` + `selectField`, `dataTable`, `badge`, `emptyState`), which already do the filter form, the sort links, sorting and the empty fallback. The Services page is the reference for *behavior* (query parsing, fallbacks, links keeping the filter), not for markup: it predates the kit and hand-rolls the same table and form. `src/server.js` gets one `ROUTES` entry, which also gives the route the shared 503 handling, and `src/layout.js` gets one `NAV` entry.

**Tech Stack:** Node 20+, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route is `/deploys`; nav label "Deploys", placed directly after "Services".
- Read-only. No deploy details page, no pagination, no live refresh, no actions.
- Snapshot: `data/deploys.json`, `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`; `finishedAt` is `null` while in progress.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`.
- Environment dropdown options, in order: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order newest first. Service and Started sort both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` in minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json`: the same 503 "Snapshot unavailable" page as other pages. Unknown `env`, `sort` or `dir` falls back to the default.
- Tests: `node --test`. No new dependencies (`package.json` stays dependency-free, `engines.node` stays `>=20`).

## Decisions the spec leaves open

These are the plan's choices; flag any you want changed before execution.

1. **Query values.** `sort` is `service` or `startedAt` (the snapshot field names, as Services uses `deployedAt`). Defaults: `env=all`, `sort=startedAt`, `dir=desc`. Since the default direction is `desc`, `?sort=service` with no `dir` sorts Z to A. The header links always carry an explicit `dir` (a newly clicked column starts ascending, as on Services), so this only shows up for hand-typed URLs.
2. **Header subtitle copy:** `Snapshot taken 2026-10-01T09:30:00Z`. Raw ISO timestamp, like the Started column and the Services page's Deployed column.
3. **Empty copy with no filter:** if the snapshot itself is empty and env is "All environments", the text is "No deploys", not "No deploys in all".
4. **Ties when sorting by Service:** `dataTable` sorts stably, so deploys of the same service keep snapshot order (newest first) in both directions. No secondary key.
5. **Styles:** none added. `public/kit.css` already styles `kit-page-header`, `kit-filter-bar`, `kit-field`, `kit-table`, `kit-badge--*` and `kit-empty`; `public/kit.js` already autosubmits the select.

## Grounding

- Page module shape (`renderX(snapshot, query)` returning an HTML string, a leading comment documenting the query params, constants at the top): `src/pages/services.js:5-21`.
- Query parsing and fallback to defaults: `src/pages/services.js:14-16`.
- Kit import style (`#kit/<name>`): `src/pages/services.js:1-2`; import map `package.json:7-9`.
- Sortable table, sort links, stable sort, empty fallback: `vendor/kit/table/src/lib/table.js:3-69`.
- Filter form with kept query state, autosubmit select: `vendor/kit/filter-bar/src/lib/filter-bar.js:3-21`, `vendor/kit/select/src/lib/select.js:3-21`, `public/kit.js:7-10`.
- Status chip tones (`ok`/`bad`/`warn`/`info`) and their colors: `vendor/kit/badge/src/lib/badge.js:3-15`, `public/kit.css:19-24`.
- Header with subtitle: `vendor/kit/page-header/src/lib/page-header.js:3-14`.
- Empty state: `vendor/kit/empty/src/lib/empty.js:3-12`.
- Escaping: kit components escape their text arguments; `dataTable` escapes `row[key]` unless a column has `render` (`vendor/kit/table/src/lib/table.js:33`). `badge` escapes its label.
- Status-to-class mapping as a small lookup at the call site: `src/pages/services.js:99-103` (here a `STATUS_TONES` object, since the kit asks you to map states to tones at the call site, `badge.js:5`).
- Routing and the shared 503: `src/server.js:17-43`.
- Nav: `src/layout.js:3-9`.
- Page test shape (inline fixture snapshot, regex assertions on exact markup, `indexOf` for row order): `test/pages/services.test.js:1-47`.
- Server test shape (`handle()` called directly, `dataDir` pointed at a missing directory for 503): `test/server.test.js:1-25`.
- Duration formatting: `none: no existing pattern for duration formatting`. The plan defines `formatDuration` in Task 1.
- Temp-dir fixtures in tests: `none: no existing pattern`. Task 2 uses `node:fs/promises` `mkdtemp` + `node:os` `tmpdir` for the unreadable-file case.

---

### Task 1: Deploys page renderer

**Risk tier:** standard (new page module plus tests; composes several kit components)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit components `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `badge(label, tone)`, `emptyState({title})`, all via `#kit/<name>`.
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string`, the page body (no layout).
  - `formatDuration(startedAt: string, finishedAt: string | null): string`, e.g. `"4m 12s"` or `"running"`.

**Mirror:** `src/pages/services.js:5-21` for the module comment, constants and query fallbacks; `test/pages/services.test.js:1-47` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately not in newest-first order so the default sort is really tested.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1037', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:12:48Z', author: 'dana' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
  ],
};

// Row order, read off the Service cells.
function services(html) {
  return [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot taken 2026-10-01T09:30:00Z<\/p>/);
});

test('lists every deploy newest first by default, with the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(services(html), ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<tr><td>billing<\/td><td>2\.9\.0-rc\.3<\/td><td>staging<\/td><td><span class="kit-badge kit-badge--bad">failed<\/span><\/td><td>2026-10-01T06:45:00Z<\/td><td>2m 30s<\/td><td>sam<\/td><\/tr>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(services(asc), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(services(desc), ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(services(oldest), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.deepEqual(services(newest), ['search', 'notifications', 'billing', 'api-gateway']);
});

test('keeps the sort when filtering', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
});

test('filters by environment and keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.deepEqual(services(html), ['notifications', 'api-gateway']);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('offers all environments first, selected by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(
    html,
    /<select name="env" class="kit-select" data-autosubmit><option value="all" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option><\/select>/,
  );
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows durations, and running for an in-progress deploy', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>7m 48s<\/td>/);
  assert.match(html, /<td>2026-10-01T09:05:00Z<\/td><td>running<\/td>/);
});

test('formats a duration in minutes and seconds', () => {
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:50:45Z'), '0m 45s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T10:05:00Z'), '75m 0s');
  assert.equal(formatDuration('2026-10-01T08:50:00Z', null), 'running');
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('says no deploys, without an environment, when the snapshot is empty', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(services(html), ['search', 'notifications', 'billing', 'api-gateway']);
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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so newest first).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const envField = selectField({
    name: 'env',
    label: 'Environment',
    value: env,
    options: [
      { value: 'all', label: 'All environments' },
      ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
    ],
  });
  const filters = filterBar({ action: '/deploys', fields: [envField], keep: { sort, dir } });

  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
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

  const header = pageHeader({ title: 'Deploys', subtitle: `Snapshot taken ${snapshot.generatedAt}` });
  return `${header}
${filters}
${table}`;
}

// "4m 12s" between two ISO timestamps; "running" until the deploy finishes.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- Don't hand-roll the table, sort headers, filter form or chips the way `services.js` does. The kit components are the ones to use, and the test regexes are written against their exact markup.
- `formatDuration` output is only digits and `m`/`s`/`running`, so returning it unescaped from `render` is safe. `badge` escapes its label itself.
- An unknown `status` string gets `STATUS_TONES[status]` of `undefined` (or an inherited `Object.prototype` member), which `badge` maps to its `muted` tone. No extra guard needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 13 tests.

Then the whole suite: `npm test`
Expected: PASS, nothing else affected.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard (wires the page into routing and the shared layout; touches the server's 503 path through a new route)

**Files:**
- Modify: `src/server.js:8-23` (import + `ROUTES` entry)
- Modify: `src/layout.js:3-9` (`NAV` entry)
- Modify: `README.md:16-18` (page list)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` route; nav link `<a href="/deploys">Deploys</a>` right after Services.

**Mirror:** `test/server.test.js:6-25` for the route and 503 tests.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, add these imports at the top alongside the existing ones:

```js
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
```

Add `'/deploys'` to the nav loop, so the existing test reads:

```js
test('serves every page in the nav', async () => {
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
    assert.equal((await handle(path)).status, 200, path);
  }
});
```

Then add, after the existing `'answers 503 when the snapshot cannot be read'` test:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.match(res.body, /<option value="production" selected>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10-01T09');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `serves every page in the nav` fails on `/deploys` (404 !== 200), the deploys layout test fails on status, and both deploys 503 tests fail because the route is unknown (404 !== 503).

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order after line 7:

```js
import { renderDeploys } from './pages/deploys.js';
```

and the route after the `/services` entry:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
  '/oncall': { title: 'On-call', snapshot: 'oncall', render: renderOncall },
  '/runbooks': { title: 'Runbooks', snapshot: 'runbooks', render: renderRunbooks },
};
```

In `src/layout.js`:

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

No change to `handle()`: the existing `try`/`catch` around `readSnapshot` already returns the 503 for a missing file and for JSON that does not parse.

- [ ] **Step 4: Update the README page list**

In `README.md`, replace lines 16-18 with:

```markdown
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each
in `src/pages/`. `src/server.js` routes requests and wraps each page in
`src/layout.js`; `public/app.css` holds the dashboard's styles.
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites, including the 13 deploys page tests from Task 1.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`.
Expected: "Deploys" is in the nav after "Services" and highlighted. The table shows 10 deploys, newest (`search`, `in-progress`, blue chip, "running") first. Choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`. Clicking "Service" sorts A to Z and keeps `env=staging`. Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Serve the deploys page and link it from the nav"
```
