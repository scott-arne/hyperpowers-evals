# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)` and builds the page **entirely from the vendored Harbor component library** in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`). `src/server.js` gets one `ROUTES` entry, which gives the page the existing snapshot read and 503 handling for free, and `src/layout.js` gets one `NAV` entry.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; nav link label "Deploys", placed after "Services".
- Read-only. Out of scope: deploy details page, pagination, live refresh, any action on a deploy.
- Data comes from `data/deploys.json` (`{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`). `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is null while in progress.
- Header "Deploys", with the snapshot time under it.
- Environment dropdown: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages. Unknown `env`, `sort` or `dir` → falls back to the default.
- Tests run with `node --test` (`npm test`). No new dependencies.
- **Use the `src/ui/` component library** for every piece of the page. Do not hand-roll HTML, a local `escapeHtml`, or new CSS classes the way `src/pages/services.js` does. No changes to `public/app.css` or `public/harbor.css` are needed: every class the page emits (`ui-table`, `ui-chip--*`, `ui-filter-bar`, `ui-empty`, …) is already styled in `public/harbor.css:15-29`.

## Grounding

- **Page module shape / naming:** `src/pages/overview.js:1-24`: imports from `../ui/index.js`, exports `renderX(snapshot)`, uses `pageHeader({ title, subtitle: \`Snapshot ${snapshot.generatedAt}\` })` and `statusChip(label, tone)`. This is the page to imitate.
- **Query parsing and fallback:** `src/pages/services.js:1-7`: header comment listing query params, `ENVIRONMENTS` constant, `includes()` / equality checks that fall back to a default. Imitate *only* these lines; the rest of `services.js` (hand-built `<table>`, `pill-*` classes, local `escapeHtml`, inline `onchange`) predates the component library and is **not** the pattern to follow.
- **Component APIs:** `src/ui/table.js:3-44` (`dataTable` sorts the rows itself from `sort`, builds header links from `sortHref`, returns `empty` when there are no rows), `src/ui/filter-bar.js:3-21` (`keep` → hidden inputs, drops empty values), `src/ui/select.js:3-21` (`data-autosubmit`; `public/harbor.js:1-5` submits on change), `src/ui/chip.js:3-15` (tones `ok|warn|bad|info|muted`; unknown → muted), `src/ui/empty-state.js:3-12`, `src/ui/page-header.js:3-14`.
- **Chip colors:** `public/harbor.css:2` defines `--ok` green, `--warn` amber, `--bad` red, `--info` blue, so tones map to the spec colors as succeeded→`ok`, failed→`bad`, rolled-back→`warn`, in-progress→`info`.
- **Routing and 503:** `src/server.js:14-39`: `ROUTES` maps a path to `{ title, snapshot, render }`; `handle()` reads the snapshot inside a try/catch (covers both a missing file and invalid JSON, since `src/data.js:9-11` parses inside the same call) and renders the 503 "Snapshot unavailable" header.
- **Nav:** `src/layout.js:3-6`: `NAV` array, order is render order.
- **Error handling:** none beyond the route-level try/catch above; page renderers do not throw or catch, they normalize query values to defaults (`src/pages/services.js:6-7`).
- **Page test shape:** `test/pages/overview.test.js:1-19`: inline fixture snapshot, `assert.match` on rendered HTML.
- **Server test shape:** `test/server.test.js:1-23`: `handle(url, { dataDir })`, 503 via a non-existent `dataDir` built with `fileURLToPath(new URL(...))`.
- **Temp-file fixtures (unreadable snapshot):** none: no existing test writes a temp file; Task 2 uses `node:fs/promises` `mkdtemp`/`writeFile` under `os.tmpdir()`.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | Parse `env`/`sort`/`dir`, filter, compose the page from `src/ui/`; also exports `formatDuration` |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, default order, both sorts, filter + kept sort, sort links keep filter, chips, duration, empty state, unknown-value fallback |
| `src/server.js` | Modify `:7` (import), `:14-17` (`ROUTES`) | Route `/deploys` to the `deploys` snapshot |
| `src/layout.js` | Modify `:3-6` (`NAV`) | "Deploys" nav link after "Services" |
| `test/server.test.js` | Modify (imports + append) | Route renders in layout; 503 for missing and for unreadable snapshot |

## Decisions the spec leaves open

- **Default direction per sort column.** `?sort=service` without a valid `dir` sorts A→Z; `?sort=startedAt` (or no sort) without a valid `dir` sorts newest first. Each of `env`, `sort`, `dir` falls back independently.
- **"All environments" is the empty value** (`<option value="">`), so choosing it submits `?env=` which falls back to all. Sort links omit `env` when no filter is active.
- **Started** shows the raw ISO timestamp, like the Services page's Deployed column. **Duration** is not sortable.
- **Empty with no filter** (snapshot has zero deploys) says "No deploys".
- **Tie order** within a service sort is the snapshot's order (`dataTable` uses a stable sort).

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module composing several components, with behavior (sorting, filtering, fallbacks) a reviewer should check against the spec.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `dataTable`, `emptyState`, `filterBar`, `pageHeader`, `selectField`, `statusChip` from `src/ui/index.js` (signatures in the Grounding section).
- Produces:
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`, the page body HTML (no layout). Task 2 registers it as a route `render`; `handle()` calls it as `render(snapshot, Object.fromEntries(searchParams))`.
  - `formatDuration(deploy: { startedAt: string, finishedAt: string | null }): string`, e.g. `"4m 12s"` or `"running"`.

**Mirror:** `src/pages/overview.js:1-24` for module shape and component use; `src/pages/services.js:1-7` for query fallback only.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-0', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:09:12Z', author: 'dana' },
  ],
};

// Versions in the order their rows appear in the html.
function versionOrder(html) {
  return [...html.matchAll(/<td>(\d+\.\d+\.\d+[^<]*)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(versionOrder(html), ['1.23.0-rc.1', '0.9.3', '2.9.0-rc.3', '3.14.2']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th>/);
  assert.match(html, /<th>Duration<\/th>/);
});

test('sorts by service both ways', () => {
  assert.deepEqual(versionOrder(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), [
    '3.14.2',
    '2.9.0-rc.3',
    '0.9.3',
    '1.23.0-rc.1',
  ]);
  assert.deepEqual(versionOrder(renderDeploys(snapshot, { sort: 'service', dir: 'desc' })), [
    '1.23.0-rc.1',
    '0.9.3',
    '2.9.0-rc.3',
    '3.14.2',
  ]);
});

test('sorts by started time oldest first', () => {
  assert.deepEqual(versionOrder(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' })), [
    '3.14.2',
    '2.9.0-rc.3',
    '0.9.3',
    '1.23.0-rc.1',
  ]);
});

test('filters by environment and keeps the sort', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'desc' });
  assert.deepEqual(versionOrder(html), ['1.23.0-rc.1', '2.9.0-rc.3']);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('colors each status with a chip', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats the duration in minutes and seconds', () => {
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z' }), '4m 12s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z' }), '21m 40s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T09:05:00Z', finishedAt: null }), 'running');
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const html = renderDeploys({ ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') }, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.equal(html, renderDeploys(snapshot, {}));
  assert.match(html, /<option value="" selected>All environments<\/option>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` / "Cannot find module '.../src/pages/deploys.js'".

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { dataTable, emptyState, filterBar, pageHeader, selectField, statusChip } from '../ui/index.js';

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: formatDuration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = query.sort === 'service' ? 'service' : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys = env ? snapshot.deploys.filter((d) => d.environment === env) : snapshot.deploys;

  const envField = selectField({
    name: 'env',
    label: 'Environment',
    options: [
      { value: '', label: 'All environments' },
      ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
    ],
    value: env,
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filterBar({ action: '/deploys', fields: [envField], keep: { sort, dir } })}
${dataTable({
  columns: COLUMNS,
  rows: deploys,
  sort: { key: sort, dir },
  sortHref: (key, next) => deploysHref({ env, sort: key, dir: next }),
  empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
})}`;
}

// "4m 12s" from startedAt to finishedAt; "running" while finishedAt is null.
export function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function deploysHref(params) {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  return `/deploys?${search}`;
}
```

Notes for the implementer:
- `dataTable` does the sorting; do not pre-sort `deploys`. ISO-8601 UTC strings sort correctly as strings, so `startedAt` needs no `value` function.
- `dataTable` escapes `sortHref`'s return value and plain cells; `statusChip` escapes its label. `formatDuration` only ever returns digits, `m`, `s`, spaces or `running`, so its output is safe as trusted cell HTML.
- An unknown `status` gets `TONES[status] === undefined`, which `statusChip` turns into the `muted` tone. No extra handling.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

Then run: `npm test`
Expected: PASS, all 29 tests (19 existing + 10 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route `/deploys` and add the nav link

**Risk tier:** standard — touches two production files plus the server test (not single-file), wiring the shared route table and nav used by every page.

**Files:**
- Modify: `src/server.js:7` (import) and `src/server.js:14-17` (`ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js` (add imports at the top, append three tests)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page in the layout; 503 "Snapshot unavailable" when `deploys.json` is missing or unreadable.

**Mirror:** `src/server.js:14-17` (route entries), `src/layout.js:3-6` (nav entries), `test/server.test.js:6-19` (route and 503 tests).

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

Append to the end of the file:

```js

test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": ');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

The first test reads the real `data/deploys.json`: `0.9.4` is a production deploy and `1.23.0-rc.1` a staging one, so it also proves the query string reaches the renderer.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the three new tests FAIL (`/deploys` returns 404), the four existing tests PASS.

- [ ] **Step 3: Wire the route and the nav link**

In `src/server.js`, add the import above the `renderOverview` import (keeps the imports alphabetical):

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

In `src/layout.js`, make `NAV` read:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

No change to `handle()`: its existing try/catch around `readSnapshot` produces the 503 for both cases.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all 32 tests.

Smoke check: `npm start`, open `http://localhost:3000/deploys`, then confirm that choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`, that clicking "Service" keeps `env=staging`, and that the nav highlights "Deploys". Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and add it to the nav"
```
