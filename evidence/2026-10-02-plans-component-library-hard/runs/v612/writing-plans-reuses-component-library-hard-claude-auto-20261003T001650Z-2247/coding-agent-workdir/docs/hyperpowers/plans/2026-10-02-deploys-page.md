# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, linked from the nav after "Services".

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`, built from the vendored Keel kit components (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than copying the hand-written markup in `src/pages/services.js`. The kit's `dataTable` already sorts rows and renders sort links the same way Services does (clicking the active column flips direction, other columns start ascending, `aria-sort` and ▲/▼ on the active one), and `filterBar` + `selectField` give the same auto-submitting GET form with the sort carried in hidden inputs, so the behavior the spec asks to match comes from the kit for free. `src/server.js` gets one route entry, which also gives the page the existing 503 "Snapshot unavailable" handling; `src/layout.js` gets one nav entry.

**Tech Stack:** Node ≥ 20 ES modules, no dependencies, server-rendered HTML strings, `node --test` with `node:assert/strict`.

## Global Constraints

- No new dependencies; Node 20 or later (`package.json` `engines`).
- Tests use `node --test`, like the rest of the repository.
- Page lives at `/deploys`; nav link label "Deploys", placed after "Services".
- Read-only: no deploy details page, no pagination (the snapshot keeps the last 50 deploys), no live refresh, no actions on a deploy.
- `status` is one of `succeeded`, `failed`, `rolled-back` or `in-progress`; `finishedAt` is null while a deploy is in progress.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration format: minutes and seconds, such as "4m 12s"; an in-progress deploy shows "running".
- Empty filter result text: "No deploys in staging" (naming the chosen environment), in place of the table.
- Filter dropdown options: "All environments" (default), "production", "staging".
- Unknown `env`, `sort` or `dir` values fall back to the default.
- Do not modify anything under `vendor/kit/` — it is the vendored Keel template; consume it through the `#kit/*` import map.

## Decisions the spec leaves open

- **Query values.** `?sort=service|startedAt`, `?dir=asc|desc`, `?env=all|production|staging`. Default is `sort=startedAt`, `dir=desc` (newest first). Because the default direction is `desc`, an unknown `dir` falls back to `desc` (Services falls back to `asc` because its default is ascending).
- **Empty with "All environments".** Only possible if the snapshot is empty; the page says "No deploys".
- **Chip colors** come from the kit badge tones: `ok` (green), `bad` (red), `warn` (amber), `info` (blue). The kit's amber (`#9a6700`) is slightly darker than the Services pill amber (`#bf8700`); no CSS changes are planned.
- **Snapshot time** is shown as `Snapshot <generatedAt>`, the same wording the Overview page uses.

## File Structure

- Create `src/pages/deploys.js` — renders the Deploys page body from the snapshot and query; exports `renderDeploys` and `formatDuration`.
- Create `test/pages/deploys.test.js` — rendering tests for the page.
- Modify `src/server.js` — add the `/deploys` route.
- Modify `src/layout.js` — add the nav link.
- Modify `test/server.test.js` — route, nav, and 503 tests.
- Modify `README.md` — list the new page.

No CSS changes: `public/kit.css` already styles every kit component used.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with filtering, sorting and formatting logic plus its tests.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, vendored — do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header` (escapes `title`/`subtitle`; renders `<header class="kit-page-header"><div><h1>…</h1><p class="kit-muted">…</p></div></header>`)
  - `filterBar({ action, fields: string[], keep?: Record<string, string> }) → string` from `#kit/filter-bar` (GET form; `keep` becomes hidden inputs)
  - `selectField({ name, label, options: {value, label}[], value }) → string` from `#kit/select` (marked `data-autosubmit`; `public/kit.js` submits on change)
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table` (sorts rows by `sort`; columns `{key, label, sortable?, render?}`; returns `empty` instead of a table when `rows` is empty)
  - `badge(label, tone) → string` from `#kit/badge`, tones `'ok' | 'warn' | 'bad' | 'info' | 'muted'`
  - `emptyState({ title, body? }) → string` from `#kit/empty`
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>) → string` (Task 2 wires it into the server)
  - `formatDuration(deploy: {startedAt: string, finishedAt: string | null}) → string`

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately out of date order so the default sort has to do work.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1037', service: 'api', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:09:12Z', author: 'dana' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
  ],
};

// The service names in row order.
const services = (html) => [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default, with every column', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(services(html), ['search', 'notifications', 'billing', 'api']);
  assert.match(
    html,
    /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th>/,
  );
  assert.match(html, /<td>notifications<\/td><td>0\.9\.3<\/td><td>production<\/td>/);
  assert.match(html, /<td>marco<\/td><\/tr>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(services(asc), ['api', 'billing', 'notifications', 'search']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(services(desc), ['search', 'notifications', 'billing', 'api']);
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(services(html), ['api', 'billing', 'notifications', 'search']);
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
  assert.equal(formatDuration({ startedAt: '2026-10-01T09:00:00Z', finishedAt: '2026-10-01T09:00:45Z' }), '0m 45s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T09:00:00Z', finishedAt: '2026-10-01T10:02:05Z' }), '62m 5s');
});

test('filters by environment, keeping the sort, and sorting keeps the filter', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.deepEqual(services(html), ['notifications', 'api']);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit><option value="all">All environments<\/option><option value="production" selected>production<\/option><option value="staging">staging<\/option><\/select>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(services(html), ['search', 'notifications', 'billing', 'api']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the page module**

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
// so newest first). Unknown values fall back to the defaults.
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const header = pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` });

  // The bar carries the sort, and the sort links carry the filter, so changing
  // one keeps the other.
  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
        value: env,
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
      { key: 'duration', label: 'Duration', render: formatDuration },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${header}
${filters}
${table}`;
}

// finishedAt minus startedAt, such as "4m 12s"; "running" while in progress.
export function formatDuration({ startedAt, finishedAt }) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `dataTable` escapes `sortHref`'s return value, so the raw `&` becomes `&amp;` in the markup; do not pre-escape it.
- `render` output is trusted HTML. `badge` escapes its label; `formatDuration` only ever returns digits, `m`, `s`, spaces or `running`.
- An unknown `status` gets `TONES[...] === undefined`, which `badge` turns into the grey `muted` tone.
- `SORTS` is an array, so `?sort=constructor` cannot match an inherited property.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, 27 tests (18 existing + 9 new), 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration (server routing, shared layout, server tests, README).

**Files:**
- Modify: `src/server.js` (imports near line 11; `ROUTES` near lines 17-23)
- Modify: `src/layout.js` (`NAV` near lines 3-9)
- Modify: `README.md` (the "Pages" section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1); existing `handle(url, { dataDir }) → Promise<{status, type, body}>` in `src/server.js`.
- Produces: `GET /deploys` route; nav entry `{ href: '/deploys', label: 'Deploys' }`.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, replace the import block at the top with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Replace the `'serves every page in the nav'` test's path list so it includes `/deploys`:

```js
test('serves every page in the nav', async () => {
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
    assert.equal((await handle(path)).status, 200, path);
  }
});
```

Add these two tests after `'renders the services page inside the layout'`:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(
    res.body,
    /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a><a href="\/incidents">Incidents<\/a>/,
  );
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>production<\/td>/);
});

test('answers 503 on the deploys page when deploys.json is missing or unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  try {
    const missing = await handle('/deploys', { dataDir });
    assert.equal(missing.status, 503);
    assert.match(missing.body, /<h1>Deploys<\/h1>/);
    assert.match(missing.body, /Snapshot unavailable/);

    await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:30');
    const unreadable = await handle('/deploys', { dataDir });
    assert.equal(unreadable.status, 503);
    assert.match(unreadable.body, /Snapshot unavailable/);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — `/deploys` answers 404 (in "serves every page in the nav", "renders the deploys page…", and the 503 test, which gets 404 instead of 503).

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical order with the other page imports (after `./layout.js`, before `./pages/incidents.js`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after `/services` in `ROUTES`:

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

The existing `try`/`catch` around `readSnapshot` already turns a missing or malformed `deploys.json` into the 503 "Snapshot unavailable" page; no other server change is needed.

- [ ] **Step 4: Add the nav link**

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

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, 29 tests, 0 failures.

- [ ] **Step 6: Update the README**

In `README.md`, change the first sentence of the "Pages" section from

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 7: Check the page in a browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: "Deploys" is highlighted in the nav after "Services"; choosing "staging" in the dropdown reloads with `?env=staging&sort=startedAt&dir=desc`; clicking "Service" then sorts A→Z and keeps `env=staging`; the four chip colors show. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js README.md
git commit -m "Route /deploys and link it from the nav"
```
