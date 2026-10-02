# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips, durations, and an empty state.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` and built entirely from the vendored Harbor component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`) — the same way `src/pages/overview.js` is built. `src/server.js` gets a `/deploys` route (which inherits the existing 503 handling), and `src/layout.js` gets a "Deploys" nav entry after "Services". No new CSS: `public/harbor.css` already styles every `ui-*` class the page uses.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, tests with `node --test` and `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; nav link label "Deploys", placed after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot is `data/deploys.json` with `generatedAt` and `deploys[]`; each deploy has `id`, `service`, `version`, `environment`, `status`, `startedAt`, `finishedAt` (null while in progress), `author`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`.
- Header "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Tests: `node --test`.
- Use the `src/ui/` component library; do not copy the hand-rolled markup, `pill-*` classes, or local `escapeHtml` from `src/pages/services.js`.

## Grounding

- Page module shape (component-library page, `Snapshot ${generatedAt}` subtitle): `src/pages/overview.js:1-24`.
- Query parsing with allow-list fallback to default: `src/pages/services.js:3-7` (imitate only the parsing; its rendering predates the component library).
- Environment list constant `['production', 'staging']`: `src/pages/services.js:3`.
- Status chip tones (`ok` green, `warn` amber, `bad` red, `info` blue, `muted` fallback): `src/ui/chip.js:3-15`, colors in `public/harbor.css:2,22-27`.
- Table with sortable headers, `sortHref(key, dir)`, `value` accessor and `empty` HTML: `src/ui/table.js:3-56`; its tests `test/ui/table.test.js:19-32`.
- Filter form that keeps other query state via hidden inputs (drops empty values): `src/ui/filter-bar.js:15-21`; select with `data-autosubmit`: `src/ui/select.js:13-21`; auto-submit script `public/harbor.js:1-5`.
- Empty state component: `src/ui/empty-state.js:9-12`.
- HTML escaping: `src/ui/escape.js:2-9` (`esc`, re-exported from `src/ui/index.js:6`).
- Routing table and 503 handling: `src/server.js:14-39`.
- Nav list: `src/layout.js:3-6`.
- Page rendering test shape (fixture snapshot, `assert.match` on HTML, `indexOf` for order): `test/pages/services.test.js:1-37`.
- Server test shape (`handle(url, { dataDir })`, missing-dir 503): `test/server.test.js:1-19`.
- Error handling: none beyond `src/server.js:27-37` — page renderers trust the snapshot shape; this plan follows that.

## Interpretations (flag for review)

- **Default `dir` per sort key.** "Newest first by default" fixes Started → `desc`. For `?sort=service` with no or unknown `dir`, the plan defaults to `asc` (A→Z). An unknown `sort` falls back to `startedAt`/`desc`.
- **Service-sort ties** (several deploys of one service) stay newest-first: rows are pre-sorted by `startedAt` descending and `dataTable`'s sort is stable.
- **Filter value for "All environments"** is the empty string (as in `test/ui/select.test.js:10`), so submitting it yields `?env=` which falls back to all.
- **Empty state when no env is chosen** (snapshot has zero deploys): "No deploys". The spec only defines the filtered wording.
- **Durations over an hour** stay in minutes, e.g. "75m 0s" — the spec asks for minutes and seconds only.
- **Started** shows the raw `startedAt` ISO string, matching how the Services page shows `deployedAt` (`src/pages/services.js:31`).

## File Structure

- Create `src/pages/deploys.js` — `renderDeploys(snapshot, query)`: query parsing, column definitions, chip tone mapping, duration formatting, filter bar, empty state.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/server.js:7-17` — import and register the route.
- Modify `src/layout.js:3-6` — nav entry.
- Modify `test/server.test.js` — route and 503 tests.

---

### Task 1: Deploys table — columns, chips, duration, header, default order

**Risk tier:** standard — new page module whose rendering logic is new code.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `pageHeader`, `dataTable`, `statusChip`, `emptyState`, `filterBar`, `selectField` from `src/ui/index.js` (signatures in Grounding).
- Produces: `export function renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string` — Task 3 registers it as a route renderer called as `render(snapshot, Object.fromEntries(searchParams))`. Also `export function formatDuration(startedAt: string, finishedAt: string | null): string`.

**Mirror:** `src/pages/overview.js:1-24` — import from `../ui/index.js`, build with components, `Snapshot ${generatedAt}` subtitle.

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
    { id: 'd-4', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T09:20:00Z', finishedAt: '2026-10-01T09:24:12Z', author: 'dana' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
  ],
};

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('has the spec columns in order', () => {
  const html = renderDeploys(snapshot, {});
  const labels = ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author'];
  const positions = labels.map((l) => html.indexOf(`${l}`, html.indexOf('<thead>')));
  assert.ok(positions.every((p, i) => p > 0 && (i === 0 || p > positions[i - 1])), positions.join());
  assert.match(html, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.match(html, /<td>priya<\/td>/);
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  const order = ['api-gateway', 'search', 'notifications', 'billing'].map((s) => html.indexOf(`<td>${s}</td>`));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats durations in minutes and seconds', () => {
  assert.equal(formatDuration('2026-10-01T09:20:00Z', '2026-10-01T09:24:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T08:10:00Z', '2026-10-01T08:31:40Z'), '21m 40s');
  assert.equal(formatDuration('2026-10-01T08:10:00Z', '2026-10-01T08:10:09Z'), '0m 9s');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
});

test('shows durations in the table', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('escapes snapshot text', () => {
  const html = renderDeploys(
    { generatedAt: 'x', deploys: [{ ...snapshot.deploys[0], author: '<b>eve</b>' }] },
    {},
  );
  assert.match(html, /&lt;b&gt;eve&lt;\/b&gt;/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`. This version already includes query parsing, the filter bar and the empty state (Task 2 adds their tests); it is written in full here so the module is never half-built.

```js
import { dataTable, emptyState, filterBar, pageHeader, selectField, statusChip } from '../ui/index.js';

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = { startedAt: 'desc', service: 'asc' };
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
  const sort = query.sort in SORTS ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORTS[sort];

  // Newest first underneath, so a stable sort by service keeps each
  // service's deploys newest first.
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env) deploys = deploys.filter((d) => d.environment === env);

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
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `/deploys?${new URLSearchParams({ ...(env && { env }), sort: key, dir: next })}`,
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// "4m 12s", or "running" while the deploy has not finished.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt == null) return 'running';
  const seconds = Math.max(0, Math.floor((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Note: the Duration column's `key: 'duration'` is not a snapshot field; it only names the column. It is not sortable, so `dataTable` never reads `row.duration`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 26 tests, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys table from the snapshot"
```

---

### Task 2: Deploys filter, sorting, empty state and query fallbacks

**Risk tier:** standard — pins the page's query-string behavior; a reviewer could reject this independently of the table rendering.

**Files:**
- Modify: `test/pages/deploys.test.js` (append tests)
- Modify: `src/pages/deploys.js` only if a test exposes a defect

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from Task 1, and the `snapshot` fixture already in `test/pages/deploys.test.js`.
- Produces: nothing new.

**Mirror:** `test/pages/services.test.js:18-37` — sort, filter, empty and fallback tests.

- [ ] **Step 1: Append the tests**

Append to `test/pages/deploys.test.js`:

```js
const order = (html, services) => services.map((s) => html.indexOf(`<td>${s}</td>`));
const ascending = (positions) => positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]));

test('filters by environment', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>api-gateway<\/td>/);
});

test('the filter keeps the current sort', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(ascending(order(asc, ['api-gateway', 'billing', 'notifications', 'search'])));
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(ascending(order(desc, ['search', 'notifications', 'billing', 'api-gateway'])));
});

test('sorts by started both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(ascending(order(asc, ['billing', 'notifications', 'search', 'api-gateway'])));
  const desc = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.ok(ascending(order(desc, ['api-gateway', 'search', 'notifications', 'billing'])));
});

test('keeps a service newest first when sorting by service', () => {
  const twice = {
    generatedAt: 'x',
    deploys: [
      { ...snapshot.deploys[1], id: 'old', version: '0.9.2', startedAt: '2026-09-30T08:00:00Z' },
      snapshot.deploys[1],
    ],
  };
  const html = renderDeploys(twice, { sort: 'service', dir: 'asc' });
  assert.ok(html.indexOf('<td>0.9.3</td>') < html.indexOf('<td>0.9.2</td>'));
});

test('sort links flip direction and keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'startedAt', dir: 'desc' });
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?env=production&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<a href="\/deploys\?env=production&amp;sort=service&amp;dir=asc">Service<\/a>/);
});

test('sort links leave env out when showing all environments', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a>/);
});

test('names the environment when the filter matches nothing', () => {
  const html = renderDeploys({ generatedAt: 'x', deploys: [snapshot.deploys[2]] }, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<th aria-sort="descending"><a href="[^"]*">Started ▼<\/a><\/th>/);
  assert.ok(ascending(order(html, ['api-gateway', 'search', 'notifications', 'billing'])));
});

test('defaults the direction for the chosen sort', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'nope' });
  assert.match(html, /<th aria-sort="ascending"><a href="[^"]*">Service ▲<\/a><\/th>/);
});
```

- [ ] **Step 2: Run the tests**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 17 tests. Task 1's implementation already covers this behavior, so these tests pin it rather than drive new code. If any fails, the defect is in `src/pages/deploys.js`; fix it there (not by loosening the test) and re-run.

- [ ] **Step 3: Prove the tests bite**

Temporarily change `SORTS` in `src/pages/deploys.js` to `{ startedAt: 'asc', service: 'asc' }` and run `node --test test/pages/deploys.test.js`.
Expected: FAIL in "lists newest first by default" and "falls back to the defaults for unknown query values". Then revert the change (`git diff src/pages/deploys.js` shows nothing) and re-run: PASS.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS, 36 tests, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add test/pages/deploys.test.js
git commit -m "Deploys: test the filter, sorting, empty state and fallbacks"
```

(Include `src/pages/deploys.js` in the `git add` only if Step 2 required a fix.)

---

### Task 3: `/deploys` route and nav link

**Risk tier:** standard — multi-file integration touching the router and shared layout.

**Files:**
- Modify: `src/server.js:7-17`
- Modify: `src/layout.js:3-6`
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 HTML page; 503 when `deploys.json` cannot be read.

**Mirror:** `test/server.test.js:6-19` — route and 503 tests through `handle()`.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>search<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const { body } = await handle('/');
  assert.match(body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot unavailable/);
});
```

(`/deploys?env=staging` reads the committed `data/deploys.json`, whose staging deploys include `search`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the three new tests get status 404 / no Deploys link.

- [ ] **Step 3: Register the route**

In `src/server.js`, add the import after the services import:

```js
import { renderDeploys } from './pages/deploys.js';
```

and the route after `/services`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

(Keep imports alphabetical by path if your linter wants it: `./pages/deploys.js` before `./pages/overview.js`.)

- [ ] **Step 4: Add the nav entry**

In `src/layout.js`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 39 tests, 0 fail.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm the nav shows Deploys after Services; picking "staging" reloads with `?env=staging` and keeps the sort; clicking Service/Started flips the arrow and keeps `env`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Deploys: add the /deploys route and nav link"
```
