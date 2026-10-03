# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page so on-call can spot failed or rolled-back deploys without opening the pipeline.

**Architecture:** A new page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)` with the same contract as every other page. It builds the page out of the vendored Keel kit (`vendor/kit`, imported as `#kit/*`): `pageHeader`, `filterBar` + `selectField`, `dataTable` (which already renders sortable headers and sorts the rows), `badge` for the status chips and `emptyState`. `src/server.js` routes `/deploys` to the existing `deploys` snapshot, and `src/layout.js` lists it in the nav after Services. The existing 503 handling in `handle()` covers a missing snapshot with no new code.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services". The page title is "Deploys", so `<title>Deploys · Harbor</title>` matches the nav label (`test/e2e/titles.test.js` checks this).
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json`, which the pipeline already writes (`pipeline/jobs/deploys.js`, schema `src/shared/schemas/deploys.js`). Don't change the pipeline, the schema or `data/`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is `null` while in progress.
- Query parameters: `env` ∈ {`production`, `staging`} (default: all); `sort` ∈ {`service`, `startedAt`} (default `startedAt`); `dir` ∈ {`asc`, `desc`}. An unknown value falls back to the default.
- Status colors: succeeded green, failed red, rolled-back amber, in-progress blue. These map to the kit badge tones `ok`, `bad`, `warn` and `info` (`public/kit.css`: `--kit-ok #1a7f37`, `--kit-bad #cf222e`, `--kit-warn #9a6700`, `--kit-info #0969da`).
- Duration format: `<minutes>m <seconds>s`, as in "4m 12s". An in-progress deploy shows "running".
- Empty filter result: "No deploys in staging" (it names the chosen environment) in place of the table.
- **Reuse the vendored kit.** Do not edit anything under `vendor/kit/`, and do not add CSS to `public/app.css`. The kit components and `public/kit.css` already provide every style this page needs. Do not hand-roll the table, the sort headers, the filter form or the chips the way `src/pages/services.js` does.
- No new dependencies. Tests use `node --test`.
- Commit subjects follow the repo's changelog prefixes (`Dashboard: …`, `Pipeline: …`; see `tools/release/version.test.js`).

## Design decisions the spec leaves open

These are visible to your human partner. Change them here before execution if they're wrong.

1. **`dir` fallback is per column.** A missing or unknown `dir` gives the column's natural direction: `startedAt` → `desc` (newest first), `service` → `asc` (A→Z). With no query at all this yields the spec's default (Started, newest first), and a hand-edited `?sort=service` doesn't come out Z→A. The header links always carry an explicit `dir`, so this only affects hand-edited URLs.
2. **The Started column shows `formatTimestamp(startedAt)`** (`2026-10-01 09:05 UTC`, from `src/core/format/timestamp.js`) but sorts on the raw ISO string.
3. **The subtitle reads `As of 2026-10-01 09:30 UTC`**, using the same formatter on `generatedAt`. It is left out if `generatedAt` can't be parsed.
4. **An empty snapshot with no filter says "No deploys".** The spec's empty state only covers a filter. Without a filter, "No deploys in all" would read wrong.
5. **Within one service, deploys keep the snapshot's newest-first order.** `dataTable` sorts with `Array.prototype.sort`, which is stable, and the snapshot is written newest first.
6. **Seconds are not zero-padded** ("1m 5s"), matching the spec's "4m 12s" style. Under a minute shows "0m 45s".

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query parsing, filtering, and composing the kit components |
| `test/pages/deploys.test.js` | Create | Rendering tests: default order, both sorts, filter, chips, duration, empty state, fallbacks, escaping |
| `src/server.js` | Modify (import block, `ROUTES`) | Route `/deploys` → `deploys` snapshot, title "Deploys" |
| `src/layout.js` | Modify (`NAV`) | "Deploys" nav link after "Services" |
| `test/server.test.js` | Modify | Route test, 503 test, `/deploys` in the nav list |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot. The e2e empty-snapshot test walks every nav link and would get a 503 without it |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot, needed by the e2e one-row test for the same reason |
| `README.md` | Modify ("Pages" paragraph) | Mention Deploys in the page list |

---

### Task 1: The Deploys page renderer

**Risk tier:** standard — a new page module with query-parsing and fallback behavior. The plan holds the full content, but the per-column `dir` fallback and the kit composition are judgment calls a reviewer should check.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`. Escapes `title` and `subtitle`.
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`. Renders a GET form. `keep` becomes hidden inputs.
  - `selectField({ name, label, options: {value,label}[], value? }) → string` from `#kit/select`. Marked `data-autosubmit`; `public/kit.js` submits the form when it changes.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table`. Sorts rows by `sort` (comparing `col.value ?? row[col.key]`), renders sortable headers with ▲/▼ and `aria-sort`, flips direction when the active column is clicked and starts other columns at `asc`, escapes `sortHref` output, and returns `empty` in place of the table when `rows` is empty. A cell without `render` shows the escaped `row[key]`. `render` returns trusted HTML.
  - `badge(label, tone) → string` from `#kit/badge`. Renders `<span class="kit-badge kit-badge--<tone>">label</span>`, with tone ∈ `ok|warn|bad|info|muted` and unknown tones falling back to `muted`.
  - `emptyState({ title, body? }) → string` from `#kit/empty`. Renders `<div class="kit-empty"><p class="kit-empty__title">title</p></div>`.
  - `formatTimestamp(iso) → string` from `src/core/format/timestamp.js`. Returns `'YYYY-MM-DD HH:MM UTC'`, or `''` if the value is invalid.
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string,string>): string`, where `Deploy = { id, service, version, environment, status, startedAt, finishedAt: string|null, author }`. Task 2 imports it.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in start order, so the tests prove the page sorts.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1037', service: 'api', version: '3.1.0', environment: 'production', status: 'failed', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:06:05Z', author: 'li' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1040', service: 'billing', version: '2.8.1', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'ana' },
  ],
};

// Service names in row order. Body rows start `<tr><td>`; the header row
// starts `<tr><th>`.
const order = (html) => [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1>/);
  assert.match(html, /As of 2026-10-01 09:30 UTC/);
});

test('lists the newest deploys first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['search', 'notifications', 'billing', 'api']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(html), ['api', 'billing', 'notifications', 'search']);
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(order(az), ['api', 'billing', 'notifications', 'search']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(order(za), ['search', 'notifications', 'billing', 'api']);
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('keeps the current sort when the filter changes', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('filters by environment and keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.deepEqual(order(html), ['notifications', 'billing', 'api']);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<option value="all">All environments<\/option>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows the duration in minutes and seconds, or running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>1m 5s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const production = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(production, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('says so when the snapshot has no deploys at all', () => {
  const html = renderDeploys({ generatedAt: snapshot.generatedAt, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(order(html), ['search', 'notifications', 'billing', 'api']);
});

test('a known sort without a direction starts in its natural direction', () => {
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'service' })), ['api', 'billing', 'notifications', 'search']);
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'startedAt', dir: 'up' })), ['search', 'notifications', 'billing', 'api']);
});

test('escapes snapshot text', () => {
  const html = renderDeploys({ ...snapshot, deploys: [{ ...snapshot.deploys[0], author: '<b>mallory</b>' }] }, {});
  assert.match(html, /&lt;b&gt;mallory&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>mallory/);
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
import { formatTimestamp } from '../core/format/timestamp.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest first).
const ENVIRONMENTS = ['production', 'staging'];
// Each sortable column and the direction it takes when ?dir is missing or
// unknown, so a hand-edited ?sort=service still reads A to Z.
const SORTS = { service: 'asc', startedAt: 'desc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORTS[sort];

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const at = formatTimestamp(snapshot.generatedAt);
  const header = pageHeader({ title: 'Deploys', subtitle: at ? `As of ${at}` : '' });

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

  // The sort links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
      { key: 'duration', label: 'Duration', render: duration },
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

// "4m 12s" from start to finish; a deploy still in progress has no finish.
function duration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 13 tests, 0 failures.

- [ ] **Step 5: Run the whole suite**

Run: `node --test`
Expected: PASS, 393 tests (the 380 at baseline plus 13), 0 failures. Nothing routes to the page yet, so no other test changes.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Dashboard: add the Deploys page renderer"
```

---

### Task 2: Route the page and link it in the nav

**Risk tier:** standard — a multi-file integration across the server, the layout, two e2e fixture directories and the README. The nav change is picked up by every e2e suite that walks the nav.

**Files:**
- Modify: `src/server.js` (import block, `ROUTES` table)
- Modify: `src/layout.js` (`NAV` array)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` ("Pages" paragraph)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). Also the existing `handle(url, { dataDir }) → Promise<{ status, type, body }>` from `src/server.js`, and `readSnapshot(name, dir)` from `src/data.js`, which reads `<dir>/<name>.json`.
- Produces: `GET /deploys` → 200 with the page in the layout, or 503 "Snapshot unavailable" when `deploys.json` can't be read. A "Deploys" nav link after "Services".

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add these two tests after `'renders the services page inside the layout'`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

In the same file, in `'serves every page in the nav'`, change the first line of `paths` from:

```js
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

to:

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

(In `data/deploys.json`, `notifications` only deploys to production and version `1.23.0-rc.1` only appears in staging, so the first test checks that the filter goes through the route.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `renders the deploys page…`, `answers 503 when the deploys snapshot…` and `serves every page in the nav` all fail with status `404` where `200`/`503` was expected.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical order, after the `renderDatabases` import:

```js
import { renderDeploys } from './pages/deploys.js';
```

In `ROUTES`, add this entry directly after the `/services` line:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, in `NAV`, add this entry directly after `{ href: '/services', label: 'Services' },`:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests, 0 failures.

- [ ] **Step 6: Run the e2e suites to see the missing fixtures**

Run: `node --test test/e2e/`
Expected: FAIL in `every page renders an empty snapshot` and `every page renders a one-row snapshot`, on `/deploys` with `503 !== 200`. Those suites walk every nav link against `test/e2e/fixtures/{empty,single}/`, and neither directory has `deploys.json` yet.

- [ ] **Step 7: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1041", "service": "notifications", "version": "0.9.4", "environment": "production", "status": "succeeded", "startedAt": "2026-10-01T08:50:00Z", "finishedAt": "2026-10-01T08:54:12Z", "author": "marco" }
  ]
}
```

- [ ] **Step 8: Run the e2e suites to verify they pass**

Run: `node --test test/e2e/`
Expected: PASS, 0 failures. This covers navigation (Deploys marks itself current), titles (`Deploys · Harbor`), missing (503), empty, single and queries (`?sort=bogus&dir=sideways&env=mars` → 200).

- [ ] **Step 9: Update the README**

In `README.md`, in the "Pages" section, change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks. `src/server.js`
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks. `src/server.js`
```

- [ ] **Step 10: Run the whole suite**

Run: `node --test`
Expected: PASS, 395 tests (the 393 after Task 1 plus the 2 new server tests), 0 failures.

- [ ] **Step 11: Check it in the browser**

Run: `npm start`, then open these pages:
- `http://localhost:3000/deploys`: the Deploys link is current in the nav. The table is newest first. The chips are green, red, amber and blue. The in-progress row shows "running".
- Change the Environment dropdown to staging. The page reloads with `?env=staging&sort=startedAt&dir=desc` (the kit's `data-autosubmit` handler in `public/kit.js` submits the form).
- Click Service twice. The order goes A→Z, then Z→A, and `env=staging` stays in the URL.

Stop the server.

- [ ] **Step 12: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Dashboard: route the Deploys page and link it in the nav"
```
