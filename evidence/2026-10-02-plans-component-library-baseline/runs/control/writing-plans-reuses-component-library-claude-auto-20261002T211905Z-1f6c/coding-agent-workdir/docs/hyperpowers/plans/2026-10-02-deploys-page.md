# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing the pipeline's recent deploys, with an environment filter, sortable Service and Started columns, colored status chips, and durations, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)` and builds the page entirely from the vendored Harbor component library in `src/ui/` (`pageHeader`, `filterBar` + `selectField`, `dataTable`, `statusChip`, `emptyState`, `esc`). `src/server.js` gets one more `ROUTES` entry pointing at the `deploys` snapshot, which reuses the existing 503 path as-is. `src/layout.js` gets one more `NAV` entry. No new CSS: the `ui-*` classes in `public/harbor.css` already style every component used.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; the nav link reads "Deploys" and sits immediately after "Services".
- Read-only. No deploy details page, no pagination (the snapshot keeps the last 50), no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json` (`{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`), read with the existing `readSnapshot`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter options, in order: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sort both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, such as "4m 12s"; an in-progress deploy shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json`: the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir`: fall back to the default.
- Tests run with `node --test` (`npm test`).
- Use the `src/ui/` components; do not add markup or CSS that duplicates them (`src/ui/index.js:1-2` asks that the vendored library stay untouched, so no edits under `src/ui/` either).

### Decisions this plan makes where the spec is silent

Flag any of these when you review the plan:

1. **Query values:** `sort` is `service` or `startedAt` (the snapshot field names, like `?sort=deployedAt` on the services page); `dir` is `asc` or `desc`. The "All environments" option carries `value=""`, so it submits `?env=`, which falls back to all.
2. **Default direction per sort:** `startedAt` defaults to `desc` (newest first, per the spec); `service` defaults to `asc` (A→Z) when `dir` is missing or unknown. An unknown `sort` falls back to `startedAt` and `desc`.
3. **Sort header links** come from `dataTable`: clicking an inactive sortable header sorts it `asc`, and clicking the active header flips its direction. So the first click on Started from a Service sort shows oldest first.
4. **The filter form always carries `sort` and `dir`** as hidden inputs, defaults included, so the filter keeps the current sort without any special cases.
5. **Unfiltered empty state:** if the snapshot itself has no deploys and no environment is chosen, the page says "No deploys" (the spec only covers the filtered case).
6. **Started** shows the raw `startedAt` ISO string, the way the services page shows `deployedAt`. Duration rounds to whole seconds, and minutes do not roll over into hours ("75m 0s").

## Grounding

- **Page module shape and query normalization:** `src/pages/services.js:1-7`. Header comment documents the query params, an `ENVIRONMENTS` array, unknown values normalized at the top of the render function. Copy **only** this part: the rest of that file (`services.js:17-74`) hand-rolls `<select>`, `<table>`, `.pill` chips and its own `escapeHtml`, which is exactly what `src/ui/` replaces. Do not copy it.
- **Building a page from the component library:** `src/pages/overview.js:1-24`. Imports from `../ui/index.js`, maps domain state to a `statusChip` tone at the call site, uses `pageHeader({ title, subtitle: \`Snapshot ${snapshot.generatedAt}\` })`.
- **Components and their contracts:** `src/ui/table.js:3-44` (`dataTable`: `columns[].render` returns trusted HTML; otherwise cells are escaped; sorts rows by `sort`; `sortHref(key, dir)` links sortable headers; `empty` replaces the table when there are no rows); `src/ui/table.js:46-56` (header link flips direction, adds the ▲/▼ arrow and `aria-sort`); `src/ui/filter-bar.js:3-21` (`keep` adds hidden inputs and drops empty values); `src/ui/select.js:3-21` (`data-autosubmit`, which `public/harbor.js` submits on change); `src/ui/chip.js:3-15` (tones `ok|warn|bad|info|muted`); `src/ui/empty-state.js:3-12`; `src/ui/escape.js:1-9`.
- **Chip colors:** `public/harbor.css:2` (`--ok` green `#1a7f37`, `--warn` amber `#9a6700`, `--bad` red `#cf222e`, `--info` blue `#0969da`) and `public/harbor.css:22-27`. So succeeded→`ok`, failed→`bad`, rolled-back→`warn`, in-progress→`info`.
- **Routing and the 503:** `src/server.js:14-17` (the `ROUTES` table: `title`, `snapshot`, `render`); `src/server.js:21-39` (`handle` reads `route.snapshot`, answers 503 "Snapshot unavailable" when the read or parse throws, and passes `Object.fromEntries(searchParams)` as `query`).
- **Nav:** `src/layout.js:3-6` (the `NAV` array, rendered in order; the active item gets `aria-current="page"`).
- **Error handling:** `src/server.js:27-37`. The page renderer does not catch anything: a bad snapshot is handled by the route. Unknown query values are normalized rather than rejected (`src/pages/services.js:6-7`).
- **Naming:** `renderX(snapshot, query)` exported per page (`src/pages/services.js:5`, `src/pages/overview.js:5`); module-level `UPPER_CASE` constants for fixed sets (`src/pages/services.js:3`, `src/ui/chip.js:3`).
- **Page test shape:** `test/pages/services.test.js:1-37`. An inline `snapshot` fixture, one `test()` per behavior, `assert.match` against exact HTML fragments, row order checked with `indexOf`.
- **Server test shape:** `test/server.test.js:1-29`. Call `handle(url, { dataDir })` directly; the 503 test points `dataDir` at a directory without the snapshot (`test/server.test.js:14-19`).
- **Temp-directory fixtures in tests:** none. No existing test writes files; Task 2 introduces `mkdtemp` under `os.tmpdir()` for the "unreadable" case.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module that integrates six library components, with query-state logic (filter, sort, fallback) that the reviewer should check against the spec.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js`: `dataTable`, `emptyState`, `esc`, `filterBar`, `pageHeader`, `selectField`, `statusChip` (signatures as in the Grounding section; all unchanged).
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`, which returns trusted page-body HTML. Task 2 registers it in `ROUTES`. `formatDuration` stays module-private.

**Mirror:** `src/pages/overview.js:1-24` for building from `../ui/index.js` and mapping states to chip tones; `src/pages/services.js:1-7` for the header comment and query normalization only.

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

// Asserts the strings appear in this order in the html.
function assertOrder(html, ...needles) {
  const positions = needles.map((n) => html.indexOf(n));
  assert.ok(positions.every((p) => p !== -1), `missing one of ${needles.join(', ')}`);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), `expected order ${needles.join(' < ')}`);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, '<td>1.23.0-rc.1</td>', '<td>0.9.4</td>', '<td>0.9.3</td>', '<td>2.9.0-rc.3</td>');
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by started oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(html, '<td>2.9.0-rc.3</td>', '<td>0.9.3</td>', '<td>0.9.4</td>', '<td>1.23.0-rc.1</td>');
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(asc, '<td>billing</td>', '<td>notifications</td>', '<td>search</td>');
  assert.match(asc, /<th aria-sort="ascending"><a href="\/deploys\?sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(desc, '<td>search</td>', '<td>notifications</td>', '<td>billing</td>');
});

test('filters by environment and keeps the sort in the filter form', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<td>notifications<\/td>/);
  assert.doesNotMatch(html, /<td>search<\/td>|<td>billing<\/td>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc"><\/form>/);
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows the duration in minutes and seconds, or running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="ui-empty"><p class="ui-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assertOrder(html, '<td>1.23.0-rc.1</td>', '<td>0.9.4</td>', '<td>0.9.3</td>', '<td>2.9.0-rc.3</td>');
});
```

The fixture's array order matches the expected default order on purpose, so "newest first" also holds for the pipeline's real file. The `sort: 'startedAt', dir: 'asc'` test is what proves the table actually sorts.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND ... src/pages/deploys.js`

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import {
  dataTable,
  emptyState,
  esc,
  filterBar,
  pageHeader,
  selectField,
  statusChip,
} from '../ui/index.js';

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys = env
    ? snapshot.deploys.filter((d) => d.environment === env)
    : snapshot.deploys;

  const filters = filterBar({
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
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true },
      { key: 'duration', label: 'Duration', render: (d) => esc(formatDuration(d)) },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, nextDir) => {
      const params = new URLSearchParams();
      if (env) params.set('env', env);
      params.set('sort', key);
      params.set('dir', nextDir);
      return `/deploys?${params}`;
    },
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// "4m 12s" from start to finish; "running" until the deploy finishes.
function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `dataTable` does the sorting (`src/ui/table.js:58-69`), the header arrows and `aria-sort`, and it escapes the `sortHref` output. Don't sort or escape again in the page.
- `Object.hasOwn` rather than `query.sort in DEFAULT_DIR`, so `?sort=toString` falls back instead of matching an inherited property.
- Don't touch `public/app.css` or anything under `src/ui/`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests

Then: `npm test`
Expected: PASS, 29 tests, 0 fail (19 existing + 10 new)

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route `/deploys` and add it to the nav

**Risk tier:** standard — wires the page into the server and the shared layout (two production files plus server tests) and introduces a temp-directory test fixture.

**Files:**
- Modify: `src/server.js:7` (import) and `src/server.js:14-17` (`ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); `readSnapshot('deploys', dataDir)` through the existing `handle` path.
- Produces: `GET /deploys` → 200 page, or 503 "Snapshot unavailable"; a "Deploys" nav link on every page.

**Mirror:** `src/server.js:15-16` (the existing `ROUTES` entries); `test/server.test.js:6-19` (route and 503 tests).

- [ ] **Step 1: Write the failing tests**

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
  const res = await handle('/deploys?env=production&sort=service&dir=asc');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 when deploys.json is missing or unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'services.json'), '{"generatedAt":"x","services":[]}');
  const missing = await handle('/deploys', { dataDir });
  assert.equal(missing.status, 503);
  assert.match(missing.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(missing.body, /Snapshot unavailable/);
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt":');
  const unreadable = await handle('/deploys', { dataDir });
  assert.equal(unreadable.status, 503);
  assert.match(unreadable.body, /Snapshot unavailable/);
});
```

The first test reads the real `data/deploys.json`, which has a production `rolled-back` deploy (`d-1040`, notifications). The 503 directory deliberately contains `services.json` but no `deploys.json`, so the test proves the route reads the *deploys* snapshot. The truncated JSON covers "unreadable".

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: 3 FAIL (`/deploys` answers 404, and the nav has no Deploys link); the 4 existing tests still PASS

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import above the `overview.js` import (imports are alphabetical by path):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after `/services`, so `ROUTES` reads:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

Nothing else in `handle` changes: the existing `try/catch` around `readSnapshot` already produces the 503 page titled with `route.title`.

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, make `NAV` read:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests

Then: `npm test`
Expected: PASS, 32 tests, 0 fail

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`, and confirm: Deploys is highlighted in the nav after Services; the in-progress search deploy is first and shows a blue chip and "running"; picking "staging" reloads with `?env=staging&sort=startedAt&dir=desc`; clicking Service and then Service again flips A→Z and Z→A while keeping `env=staging`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and link it in the nav"
```
