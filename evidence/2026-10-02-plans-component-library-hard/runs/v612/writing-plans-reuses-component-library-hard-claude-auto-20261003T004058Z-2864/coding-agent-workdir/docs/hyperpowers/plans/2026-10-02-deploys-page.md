# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing the recent deploys from `data/deploys.json`, with an environment filter, sorting by Service and Started, colored status chips and durations, linked from the nav after "Services".

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`, the same shape as the other pages. It is **built from the vendored Keel kit** (`vendor/kit/`, imported as `#kit/<name>`) instead of copying the hand-written markup in `src/pages/services.js`. The kit already provides each piece the spec asks for: `pageHeader` (title plus snapshot time), `filterBar` + `selectField` (GET form that auto-submits through `public/kit.js` and keeps the sort in hidden inputs), `dataTable` (sortable headers with ▲/▼ and `aria-sort`, sorting, and an empty slot), `badge` (green/red/amber/blue tones) and `emptyState`. The page matches Services on *behavior* (the `?env=`/`?sort=`/`?dir=` query shape, fallbacks, sort links that keep the filter, a filter form that keeps the sort). `src/server.js` gets a route, and `src/layout.js` gets a nav entry.

**Tech Stack:** Node ≥ 20 ES modules, no dependencies, `node --test` with `node:assert/strict`, server-rendered HTML strings.

## Global Constraints

- No new dependencies. Node 20 or later (`package.json` `engines`).
- Route `/deploys`. Nav link label "Deploys", placed right after "Services".
- Data comes from `data/deploys.json`, read through the existing `readSnapshot('deploys', dataDir)`. Each deploy has the fields `id, service, version, environment, status, startedAt, finishedAt, author`. `finishedAt` is `null` while the deploy is in progress.
- Header "Deploys", with the snapshot time under it.
- Environment dropdown: "All environments" (the default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns in this order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sort both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue. These map to kit badge tones `ok`, `bad`, `warn` and `info`.
- Duration is `finishedAt − startedAt` written as minutes and seconds, such as "4m 12s". An in-progress deploy shows "running".
- When the filter matches nothing, show "No deploys in <environment>" (for example, "No deploys in staging") in place of the table.
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages. An unknown `env`, `sort` or `dir` falls back to the default.
- Out of scope: deploy details page, pagination, live refresh, any action on a deploy. Do not refactor `src/pages/services.js` onto the kit in this change.
- Use the kit components. Do not hand-roll `<table>`, `<select>`, sort headers or chips, and do not add `.pill`/`.services`-style rules to `public/app.css`. `public/kit.css` already styles every kit class this page uses.

## Decisions the spec leaves open (flag in review if you disagree)

1. **Default direction per sort column.** The spec gives one default, "newest first" (Started, descending). When `?sort=service` arrives without a valid `?dir`, the page uses ascending (A→Z), not descending. The `SORTS` map holds each column's default direction. Clicking a header follows the kit/Services convention: the active column flips direction, and any other column starts ascending.
2. **Empty wording with "All environments".** If the snapshot holds no deploys at all, the page shows "No deploys", because "No deploys in all" reads badly. The spec only defines the filtered case.
3. **Snapshot time wording.** The subtitle reads "Snapshot <generatedAt>", the same wording the Overview page uses.
4. **Service-sort ties** (several deploys of one service) keep their snapshot order: `Array.prototype.sort` is stable and the kit sorts by a single value. No secondary key. Tests do not depend on tie order.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: resolves the query, filters, and composes the kit components. Also holds the private `duration()` formatter. |
| `test/pages/deploys.test.js` | Create | Rendering tests: default order, both sorts, chips, durations, filter, empty state, fallbacks. |
| `src/server.js` | Modify (imports, `ROUTES`) | Routes `/deploys` to the page with snapshot `deploys`. The 503 path is reused as-is. |
| `src/layout.js` | Modify (`NAV`) | Adds the "Deploys" link after "Services". |
| `test/server.test.js` | Modify | Route-in-layout test, nav order, `/deploys` added to the every-page list, 503 for missing and unreadable snapshots. |
| `README.md` | Modify ("Pages" section) | Lists Deploys among the pages. |

---

### Task 1: Deploys page module

**Risk tier:** standard — a new module that composes several kit components; the behavior has to match the spec in many small ways.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (all existing, from `vendor/kit/`, read them if in doubt):
  - `badge(label: string, tone: 'ok'|'warn'|'bad'|'info'|'muted') → string` from `#kit/badge`, which renders `<span class="kit-badge kit-badge--<tone>">label</span>`.
  - `emptyState({ title: string, body?: string }) → string` from `#kit/empty`, which renders `<div class="kit-empty"><p class="kit-empty__title">title</p></div>`.
  - `filterBar({ action: string, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`.
  - `pageHeader({ title: string, subtitle?: string }) → string` from `#kit/page-header`.
  - `selectField({ name, label, options: {value,label}[], value }) → string` from `#kit/select`. It renders `data-autosubmit`.
  - `dataTable({ columns, rows, sort: {key, dir}, sortHref: (key, nextDir) => string, empty: string }) → string` from `#kit/table`. It sorts the rows and escapes `sortHref` output and plain cells. `render` output is trusted HTML. Body rows are joined with `\n`, one `<tr>` per line.
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string,string>): string`, used by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately out of order, so the tests prove the page sorts.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// The cell contents of each table body row, top to bottom.
function rows(html) {
  const body = html.split('<tbody>\n')[1].split('\n</tbody>')[0];
  return body.split('\n').map((row) => [...row.matchAll(/<td>(.*?)<\/td>/g)].map((m) => m[1]));
}
const versions = (html) => rows(html).map((cells) => cells[1]);
const services = (html) => rows(html).map((cells) => cells[0]);

test('lists deploys newest first under the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th><th>Environment<\/th><th>Status<\/th>/);
  assert.match(html, /<th>Duration<\/th><th>Author<\/th>/);
});

test('sorts by start time both ways and keeps the sort in the filter form', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(versions(oldest), ['2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  assert.match(oldest, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(oldest, /<input type="hidden" name="dir" value="asc">/);
});

test('sorts by service both ways', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(services(az), ['billing', 'notifications', 'notifications', 'search']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(services(za), ['search', 'notifications', 'notifications', 'billing']);
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows how long each deploy took, or that it is still running', () => {
  const durations = Object.fromEntries(rows(renderDeploys(snapshot, {})).map((cells) => [cells[1], cells[5]]));
  assert.deepEqual(durations, {
    '1.23.0-rc.1': 'running',
    '0.9.4': '4m 12s',
    '0.9.3': '21m 40s',
    '2.9.0-rc.3': '2m 30s',
  });
});

test('filters by environment and keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.deepEqual(versions(html), ['0.9.4', '0.9.3']);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="all">All environments<\/option>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('names the environment when no deploys match the filter', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  const service = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.match(service, /<input type="hidden" name="dir" value="asc">/);
  assert.deepEqual(services(service), ['billing', 'notifications', 'notifications', 'search']);
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
// so the newest deploy is on top).
const ENVIRONMENTS = ['production', 'staging'];
// Each sortable column and the direction it takes when ?dir is missing or
// unknown.
const SORTS = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORTS[sort];

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const options = [
    { value: 'all', label: 'All environments' },
    ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
  ];
  const filters = filterBar({
    action: '/deploys',
    fields: [selectField({ name: 'env', label: 'Environment', options, value: env })],
    keep: { sort, dir },
  });

  // The sort links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
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

// "4m 12s" from start to finish. A deploy in progress has no finish yet.
function duration({ startedAt, finishedAt }) {
  if (finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `Object.hasOwn(SORTS, …)` (not `in` or `SORTS[x]`) is what makes `?sort=constructor` fall back. Keep it.
- Don't escape cells yourself. `dataTable` escapes plain cells and the `sortHref` result (so `&` becomes `&amp;` in the header links). `badge` and `emptyState` escape their text. `duration` returns only digits, "m", "s" and "running".
- `filterBar`'s `keep` always gets `sort` and `dir` because both are always resolved, so changing the environment keeps the current sort.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 8 tests, 0 failures.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS (the 18 existing tests plus the 8 new ones), 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys page: render recent deploys with the kit components"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — touches the router and the shared layout, which every page renders through (a multi-file integration).

**Files:**
- Modify: `src/server.js` (import block and the `ROUTES` table)
- Modify: `src/layout.js` (the `NAV` array)
- Modify: `test/server.test.js`
- Modify: `README.md` ("Pages" section)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). Existing `handle(url, { dataDir })` from `src/server.js`. Existing `readSnapshot(name, dir)`, which throws on a missing file or invalid JSON; `handle` already turns that into a 503.
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or 503 "Snapshot unavailable".

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

Insert this test directly before `test('serves every page in the nav', …)`:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});
```

(These assertions use the committed `data/deploys.json`, where `0.9.4` is a production deploy and `1.23.0-rc.1` a staging one.)

In `test('serves every page in the nav', …)`, change the path list to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Insert this test directly before `test('answers 404 for an unknown path', …)`:

```js
test('answers 503 when the deploys snapshot is missing or unreadable', async () => {
  const missing = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const unreadable = await mkdtemp(join(tmpdir(), 'harbor-'));
  try {
    // A snapshot caught halfway through a rewrite.
    await writeFile(join(unreadable, 'deploys.json'), '{"generatedAt": "2026-10-01T09');
    for (const dataDir of [missing, unreadable]) {
      const res = await handle('/deploys', { dataDir });
      assert.equal(res.status, 503, dataDir);
      assert.match(res.body, /<h1>Deploys<\/h1>/);
      assert.match(res.body, /Snapshot unavailable/);
    }
  } finally {
    await rm(unreadable, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The three tests that touch `/deploys` fail on status (`404 !== 200` or `404 !== 503`). The others pass.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical position, between the `layout.js` import and the `incidents.js` import:

```js
import { renderDeploys } from './pages/deploys.js';
```

In `ROUTES`, add this entry right after the `'/services'` entry:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, add this entry to `NAV` right after `{ href: '/services', label: 'Services' },`:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Run the full suite to verify it passes**

Run: `npm test`
Expected: PASS, 28 tests, 0 failures.

- [ ] **Step 6: Update the README**

In `README.md`, under "## Pages", replace the first line

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

with

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 7: Check it in the browser**

Run `npm start` and open `http://localhost:3000/deploys`. Check that:
- "Deploys" in the nav comes after "Services" and is marked current.
- Choosing "staging" reloads to `?env=staging&sort=startedAt&dir=desc`.
- Clicking "Service" keeps `env=staging`.
- The chips are green, red, amber and blue.
- The `search 1.23.0-rc.1` row shows "running".

Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js README.md
git commit -m "Deploys page: route it and link it from the nav"
```
