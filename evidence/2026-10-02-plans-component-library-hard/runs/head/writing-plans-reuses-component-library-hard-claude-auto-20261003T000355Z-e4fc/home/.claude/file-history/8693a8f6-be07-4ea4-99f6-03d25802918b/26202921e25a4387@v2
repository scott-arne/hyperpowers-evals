# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips, durations and an empty state. The page is linked from the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)` in the same shape as the other page modules. It is built from the vendored Keel kit components (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than hand-written markup. The kit's `dataTable` already does the sorting, the sortable header links (including flipping direction and `aria-sort`) and the empty fallback, and `filterBar` + `selectField` + `public/kit.js` already do the auto-submitting GET filter that keeps the sort. The Services page's *behavior* is the reference, as the spec says. Its hand-written markup is not copied. `src/server.js` gets one route entry and `src/layout.js` one nav entry. The 503 path is the existing shared one in `handle()`.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit modules are imported through the `#kit/*` subpath import in `package.json`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed immediately after "Services".
- Read-only. Out of scope: deploy details page, pagination (snapshot keeps the last 50), live refresh, any action on a deploy.
- Data: `data/deploys.json` (`generatedAt`, `deploys[]` with `id`, `service`, `version`, `environment`, `status`, `startedAt`, `finishedAt`, `author`). `finishedAt` is `null` while in progress.
- `status` ∈ `succeeded`, `failed`, `rolled-back`, `in-progress`.
- Header "Deploys", snapshot time under it.
- Filter dropdown: "All environments" (default), "production", "staging"; choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` → fall back to the default.
- Tests: `node --test`. No new dependencies (README: "No dependencies; Node 20 or later").

**Decisions this plan makes where the spec is silent** (flagged for review):
- Query values: `sort=service|startedAt` (the column keys), `dir=asc|desc`. The default is `sort=startedAt&dir=desc`. An unknown `dir` falls back to `desc`, the default direction, whatever the sort.
- Ties in a Service sort keep snapshot order (newest first), because `dataTable` uses a stable sort.
- If the snapshot has no deploys at all with "All environments" selected, the empty state says "No deploys".
- The Started column shows the raw ISO timestamp, as the Services page's Deployed column does.
- Status chips map to kit badge tones: `ok` (green), `bad` (red), `warn` (amber), `info` (blue). `public/kit.css:19-24` already styles them, so no CSS changes are needed.

## Grounding

- Page module shape (named `renderX(snapshot, query)` export, header comment documenting the query params, whitelist-then-default parsing): `src/pages/services.js:5-16`
- Filter/sort behavior to match (active column flips direction, others start ascending; sort links carry the filter; filter form keeps sort/dir as hidden inputs): `src/pages/services.js:30-38` and `src/pages/services.js:88-94`
- Kit table (sorting via `sort`, header links via `sortHref`, `aria-sort`, ▲/▼, `empty` fallback, `render` returns trusted HTML): `vendor/kit/table/src/lib/table.js:3-69`
- Kit filter form (`keep` → hidden inputs, skips empty values): `vendor/kit/filter-bar/src/lib/filter-bar.js:3-21`
- Kit select (marks `data-autosubmit`; `public/kit.js:7-10` submits on change): `vendor/kit/select/src/lib/select.js:3-21`
- Kit badge tones: `vendor/kit/badge/src/lib/badge.js:3-15`; CSS `public/kit.css:19-24`
- Kit empty state: `vendor/kit/empty/src/lib/empty.js:3-12`
- Kit page header (h1 + `kit-muted` subtitle): `vendor/kit/page-header/src/lib/page-header.js:3-14`
- Kit import style (`import { button } from '#kit/button';` before local imports): `src/pages/incidents.js:1-2`
- Snapshot subtitle wording "Snapshot <generatedAt>": `src/pages/overview.js:29`
- Routing table + shared 503 handling: `src/server.js:17-43`
- Nav list: `src/layout.js:3-9`
- Escaping: kit components escape with `esc` (`vendor/kit/utils/src/lib/utils.js:1-9`); `src/html.js` `escapeHtml` is for hand-written markup. This page writes no hand-written markup around data values, so it needs neither directly.
- Error handling: none in page modules. Snapshot read/parse failures are caught once in `handle()` (`src/server.js:32-41`).
- Page test shape (inline fixture snapshot, `renderX(snapshot, query)`, regex matches on exact markup, `indexOf` ordering): `test/pages/services.test.js:1-47`
- Server test shape (`handle(path, { dataDir })`, missing-dir 503): `test/server.test.js:1-35`
- Temp-file fixtures in tests: `none: no existing test writes temp files`. Task 2 introduces `mkdtemp` from `node:fs/promises` for the malformed-JSON case.
- Naming: camelCase functions, `UPPER_SNAKE` module constants (`ENVIRONMENTS`, `SORTS` in `src/pages/services.js:7-11`); test names are lowercase sentences.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module combining six kit components. The plan contains the full content, but the test and source are two files and their correctness depends on kit behavior.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit exports `pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge`, `emptyState` (signatures in the Grounding files).
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string`, the page body HTML (no layout).
  - `formatDuration(startedAt: string, finishedAt: string | null): string`, e.g. `'4m 12s'` or `'running'`.

**Mirror:** `src/pages/services.js:5-16` for the header comment and query parsing; `test/pages/services.test.js` for the test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

// Out of start order on purpose, so the default sort has work to do.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Asserts the versions appear in this order in the html.
function assertOrder(html, versions) {
  const positions = versions.map((v) => html.indexOf(`<td>${v}</td>`));
  assert.ok(positions.every((p) => p !== -1), `missing one of ${versions}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `expected order ${versions}`);
}

test('shows the header with the snapshot time', () => {
  assert.match(renderDeploys(snapshot, {}), /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(oldest, ['2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assertOrder(newest, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
});

test('sorts by service both ways', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(az, ['2.9.0-rc.3', '0.9.3', '1.23.0-rc.1']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(za, ['1.23.0-rc.1', '0.9.3', '2.9.0-rc.3']);
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
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

test('formats durations under a minute and over an hour', () => {
  assert.equal(formatDuration('2026-10-01T09:00:00Z', '2026-10-01T09:00:05Z'), '0m 5s');
  assert.equal(formatDuration('2026-10-01T09:00:00Z', '2026-10-01T10:15:00Z'), '75m 0s');
  assert.equal(formatDuration('2026-10-01T09:00:00Z', null), 'running');
});

test('filters by environment, keeping the sort, and sorting keeps the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'asc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  assert.match(html, /href="\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
  assertOrder(html, ['2.9.0-rc.3', '1.23.0-rc.1']);
  assert.doesNotMatch(html, /<td>0\.9\.4<\/td>/);
});

test('names the environment when the filter matches no deploys', () => {
  const stagingOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'staging') };
  const html = renderDeploys(stagingOnly, { env: 'production' });
  assert.match(html, /<p class="kit-empty__title">No deploys in production<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="production" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
});
```

Notes for the implementer:
- The `&amp;` in the expected hrefs is correct: `dataTable` escapes the `sortHref` result with `esc`. Return a plain `&` from `sortHref` and do not pre-escape it.
- `sort: 'constructor'` guards against a prototype-key lookup slipping through the whitelist.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL. The run errors with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
const SORTABLE = ['service', 'startedAt'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTABLE.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

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

// "4m 12s" from two ISO timestamps; "running" while the deploy has no finish.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Why this is safe without `escapeHtml`: every data value reaches the HTML through a kit component that escapes it (`dataTable` cells via `esc`, `badge` label, `pageHeader` subtitle, `emptyState` title). `formatDuration` returns only digits and fixed text. `env`, `sort` and `dir` are whitelisted before they reach `sortHref`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests, 0 failures.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, 0 failures. Nothing else imports the new module yet.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration (server routing table, shared layout, README, server tests).

**Files:**
- Modify: `src/server.js:8` (import) and `src/server.js:17-23` (`ROUTES`)
- Modify: `src/layout.js:3-9` (`NAV`)
- Modify: `README.md:16-18` (Pages paragraph)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` route; "Deploys" nav entry with `href="/deploys"`.

**Mirror:** `test/server.test.js:6-25` for the layout and 503 tests; the existing `ROUTES` entries at `src/server.js:18-22`.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, replace the import block (lines 1-4) with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Change the path list in `'serves every page in the nav'` to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Then add these tests after `'serves every page in the nav'`:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('answers 503 for the deploys page when its snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 503 for the deploys page when its snapshot is half-written', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

The first test depends on the committed `data/deploys.json`: `0.9.4` is a production deploy and `1.23.0-rc.1` is staging-only.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `serves every page in the nav` fails on `/deploys` (404 !== 200), the layout test fails (404), and both 503 tests fail (404 !== 503).

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical order, before the `renderIncidents` import:

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

No change to `handle()`: its existing `try/catch` around `readSnapshot` covers both a missing file and a half-written one, since `readSnapshot` does `JSON.parse` inside it.

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

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 31 tests, 0 failures (18 existing + 10 from Task 1 + 3 new server tests, with `serves every page in the nav` extended in place).

- [ ] **Step 6: Update the README**

In `README.md`, replace lines 16-18 with:

```markdown
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each
in `src/pages/`. `src/server.js` routes requests and wraps each page in
`src/layout.js`; `public/app.css` holds the dashboard's styles.
```

- [ ] **Step 7: Check in the browser**

Run: `npm start`, then open `http://localhost:3000/deploys`.
Expected: "Deploys" is highlighted in the nav after "Services". The table is newest first, starting with `search` `1.23.0-rc.1` with a blue "in-progress" chip and "running". Choosing "staging" in the dropdown reloads to `/deploys?env=staging&sort=startedAt&dir=desc`. Clicking "Service" then gives `?env=staging&sort=service&dir=asc`. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js README.md
git commit -m "Deploys: route /deploys and link it from the nav"
```
