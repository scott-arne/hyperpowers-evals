# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing the recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, linked from the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)` like the other pages. It is built from the vendored Keel kit components (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than the hand-written markup in `src/pages/services.js`. The kit's `dataTable` already handles sortable headers the way the Services page does (clicking the active column flips it, any other column starts ascending, `aria-sort`, ▲/▼). The kit's `filterBar` keeps the sort in hidden inputs, and `public/kit.js` submits it when the select changes. `src/server.js` gets one `ROUTES` entry, so the existing snapshot loading and 503 handling apply unchanged, and `src/layout.js` gets one `NAV` entry.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`; nav link label "Deploys", placed right after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`. `finishedAt` is `null` while in progress.
- Columns, in this order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (`startedAt` descending).
- Only Service and Started are sortable, via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Filter dropdown: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: "No deploys in staging" (names the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` → fall back to the default.
- Tests use `node --test` (`npm test`). No new dependencies.
- Use the vendored kit components. Do not hand-roll a table, select, header, chip or empty state, and do not add new CSS: `public/kit.css` already styles every kit class used here.

## Decisions the spec leaves open (made here, flag if you disagree)

1. **Chip tones.** Kit `badge` tones map exactly onto the spec's colors: `ok` = green (`--kit-ok`), `bad` = red, `warn` = amber, `info` = blue. The page uses `badge`, not the app's `.pill` classes.
2. **Fallback for `dir`.** The default view is `startedAt` / `desc`, so any `dir` other than `asc` becomes `desc`, the same way Services treats anything but `desc` as its default `asc`. This only matters for hand-typed URLs, because the header links always include `dir`.
3. **Ties.** Rows are pre-sorted newest first before the table sorts them. Array sort is stable, so deploys of the same service stay newest first when sorting by Service in either direction.
4. **Subtitle wording.** "Snapshot from <generatedAt>", showing the raw ISO timestamp the way Services shows `deployedAt`.
5. **Empty with "All environments".** "No deploys". The spec only covers the filtered case.
6. **Sub-minute durations.** These keep the minutes part ("0m 45s"), so the format is always the same.

## File Structure

- Create `src/pages/deploys.js`: the Deploys page (`renderDeploys`) and the duration formatter (`formatDuration`).
- Create `test/pages/deploys.test.js`: rendering tests.
- Modify `src/server.js`: import plus one `ROUTES` entry.
- Modify `src/layout.js`: one `NAV` entry.
- Modify `test/server.test.js`: route, nav and 503 tests.
- Modify `README.md`: list the new page.

---

### Task 1: Deploys page module

**Risk tier:** standard (new module that composes six kit components; the behavior is spread across filter, sort and empty paths)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (vendored kit, existing, do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`
  - `selectField({ name, label, options: {value,label}[], value? }) → string` from `#kit/select`
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table`. Columns are `{ key, label, sortable?, render?(row) → trustedHtml, value?(row) }`. It escapes `sortHref` output itself, so return a raw `&`.
  - `badge(label, tone: 'ok'|'warn'|'bad'|'info'|'muted') → string` from `#kit/badge`
  - `emptyState({ title, body? }) → string` from `#kit/empty`
- Produces:
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>) → string` (page body HTML, no layout)
  - `formatDuration(startedAt: string, finishedAt: string | null) → string`

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

// Deliberately out of order so every test exercises the sort.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'dana' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Service names in row order (the Service column is first in each row).
const order = (html) => [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot from 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default with the spec columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['search', 'notifications', 'api-gateway', 'billing']);
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(order(asc), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(order(desc), ['search', 'notifications', 'billing', 'api-gateway']);
});

test('sorts by start time both ways and keeps the sort in the filter form', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(oldest), ['billing', 'api-gateway', 'notifications', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  assert.match(oldest, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(oldest, /<input type="hidden" name="dir" value="asc">/);
});

test('keeps deploys of the same service newest first when sorting by service', () => {
  const twice = {
    ...snapshot,
    deploys: [
      { ...snapshot.deploys[0], id: 'old', version: '2.8.0', startedAt: '2026-09-29T11:40:00Z' },
      snapshot.deploys[0],
    ],
  };
  for (const dir of ['asc', 'desc']) {
    const html = renderDeploys(twice, { sort: 'service', dir });
    assert.ok(html.indexOf('<td>2.9.0-rc.3</td>') < html.indexOf('<td>2.8.0</td>'), dir);
  }
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
  assert.match(html, /<td>running<\/td>/);
  assert.equal(formatDuration('2026-10-01T00:00:00Z', '2026-10-01T00:00:45Z'), '0m 45s');
  assert.equal(formatDuration('2026-10-01T00:00:00Z', '2026-10-01T01:15:03Z'), '75m 3s');
  assert.equal(formatDuration('2026-10-01T00:00:00Z', null), 'running');
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.deepEqual(order(html), ['search', 'billing']);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /href="\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
  assert.match(renderDeploys({ ...snapshot, deploys: [] }, {}), /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(order(html), ['search', 'notifications', 'api-gateway', 'billing']);
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
const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  // Newest first before the table sorts, so deploys of one service stay
  // newest first when sorting by service (the sort is stable).
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
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

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot from ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// "4m 12s"; "running" while the deploy has not finished.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

Then run the whole suite: `npm test`
Expected: PASS, 28 tests (18 existing + 10 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard (multi-file wiring into the router and the shared layout that every page renders through)

**Files:**
- Modify: `src/server.js` (imports block, lines 9-13; `ROUTES`, lines 18-24)
- Modify: `src/layout.js` (`NAV`, lines 3-9)
- Modify: `README.md` (the "Pages" section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). Also the existing `handle(url, { dataDir }) → Promise<{ status, type, body }>` and `readSnapshot(name, dir)`.
- Produces: the `/deploys` route and the "Deploys" nav entry.

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

Change the path list in `serves every page in the nav` to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Add these tests after `answers 503 when the snapshot cannot be read`:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
  const nav = res.body.slice(res.body.indexOf('<nav class="topnav">'), res.body.indexOf('</nav>'));
  assert.ok(nav.indexOf('href="/services"') < nav.indexOf('href="/deploys"'));
  assert.ok(nav.indexOf('href="/deploys"') < nav.indexOf('href="/incidents"'));
});

test('answers 503 when the deploys snapshot is missing or unreadable', async () => {
  const missing = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const gone = await handle('/deploys', { dataDir: missing });
  assert.equal(gone.status, 503);
  assert.match(gone.body, /<h1>Deploys<\/h1>/);
  assert.match(gone.body, /Snapshot unavailable/);

  const dir = await mkdtemp(join(tmpdir(), 'harbor-'));
  try {
    await writeFile(join(dir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:30:00Z", "depl');
    const torn = await handle('/deploys', { dataDir: dir });
    assert.equal(torn.status, 503);
    assert.match(torn.body, /Snapshot unavailable/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `serves every page in the nav` reports `404 !== 200` for `/deploys`, the deploys-page test fails on status 404, and the 503 test fails because `/deploys` returns 404.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical order, between `./layout.js` and `./pages/incidents.js`:

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the entry to `ROUTES` right after `/services`:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

Nothing else in `handle` changes. Its existing `try`/`catch` around `readSnapshot` already turns a missing file and a JSON parse error into the 503 page.

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, add to `NAV` right after the Services entry:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 30 tests (28 after Task 1 + 2 new server tests).

- [ ] **Step 6: Update the README**

In `README.md`, replace the first sentence of the "Pages" section:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
`src/pages/`.
```

with:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module
each in `src/pages/`.
```

(Keep the rest of the paragraph, starting at "`src/server.js` routes requests…", unchanged.)

- [ ] **Step 7: Check it in a browser-free smoke run**

Run: `node -e "import('./src/server.js').then(async m => { const r = await m.handle('/deploys'); console.log(r.status, r.body.includes('kit-badge--warn')) })"`
Expected: `200 true` (the real snapshot has a rolled-back deploy).

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js README.md
git commit -m "Route /deploys and link it from the nav"
```
