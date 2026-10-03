# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`. It has an environment filter, sorting on Service and Started, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy.

**Architecture:** One new page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)` like the other pages. `src/server.js` gets a `/deploys` route and `src/layout.js` a nav entry. The page is built from the vendored Keel kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`). The kit already does the header/subtitle, the auto-submitting filter form that keeps sort state, sortable table headers with `aria-sort` and arrows, row sorting, colored badges and the empty placeholder. Its styles are already in `public/kit.css` and the auto-submit script is in `public/kit.js`. Do **not** copy the Services page's hand-written `<form>`, `sortHeader` and `.pill` markup. That page predates the kit. The spec asks for the same *behavior* as Services, not the same markup.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit modules are imported through the `#kit/*` subpath import declared in `package.json`.

## Global Constraints

- Route `/deploys`. Nav link label "Deploys", placed directly after "Services".
- Data comes from `data/deploys.json` (`readSnapshot('deploys')`): `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `finishedAt` is null while a deploy is in progress.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`.
- Out of scope: deploy details page, pagination, live refresh, any action on a deploy.
- Header "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Changing it reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Only Service and Started are sortable, both ways, via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration is `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: "No deploys in staging" (names the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` gives the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Tests: `node --test` (`npm test`).

## Decisions the spec leaves open

These are small choices made here so the implementer doesn't have to guess. Change them if they're wrong:

1. **Snapshot line text:** `Snapshot from 2026-10-01T09:30:00Z` (the raw ISO `generatedAt`). Services also shows raw ISO timestamps.
2. **Default direction per sort column:** `startedAt` defaults to `desc` (newest first, per spec) and `service` to `asc`. So `?sort=service` with a missing or unknown `dir` sorts A→Z. The header links always carry an explicit `dir`, as on Services: clicking the active column flips it, and any other column starts ascending. This is the kit table's built-in behavior.
3. **Service-sort ties:** deploys of the same service keep their snapshot order, which the pipeline writes newest first. The kit sorts with stable `Array.prototype.sort`.
4. **Empty with "All environments":** the spec only covers a named environment. With `env=all` and zero deploys the page says "No deploys".
5. **Status colors** map to kit badge tones: succeeded → `ok` (green `#1a7f37`), failed → `bad` (red `#cf222e`), rolled-back → `warn` (amber `#9a6700`), in-progress → `info` (blue `#0969da`).
6. **Durations of an hour or more** stay in minutes, e.g. "75m 0s". The spec only asks for minutes and seconds.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: query parsing, filtering, the column definitions, duration formatting. Composes the kit components. |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, filter, both sorts, chips, duration, empty state, query fallbacks. |
| `src/server.js` | Modify (imports, `ROUTES`) | Route `/deploys` → `deploys` snapshot → `renderDeploys`. The existing 503 path covers errors. |
| `src/layout.js` | Modify (`NAV`) | "Deploys" nav link after "Services". |
| `test/server.test.js` | Modify | Route, nav order, 503 for a missing and for a malformed `deploys.json`. |
| `README.md` | Modify ("Pages" section) | List Deploys among the pages. |

No CSS changes: every class the kit components emit is already styled in `public/kit.css`, which `layout.js` loads on every page.

### Kit API reference (already in the repo, do not modify `vendor/`)

```js
import { pageHeader } from '#kit/page-header'; // pageHeader({ title, subtitle?, actions? }) -> '<header class="kit-page-header"><div><h1>…</h1><p class="kit-muted">subtitle</p></div></header>'
import { filterBar } from '#kit/filter-bar';   // filterBar({ action, fields: string[], keep?: Record<string,string> }) -> GET form; `keep` becomes <input type="hidden">
import { selectField } from '#kit/select';     // selectField({ name, label, options: [{value,label}], value }) -> <select … data-autosubmit> (kit.js submits on change)
import { dataTable } from '#kit/table';        // dataTable({ columns: [{key,label,sortable?,render?,value?}], rows, sort?: {key,dir}, sortHref?: (key,dir)=>string, empty?: html })
import { badge } from '#kit/badge';            // badge(label, 'ok'|'warn'|'bad'|'info'|'muted') -> '<span class="kit-badge kit-badge--<tone>">label</span>'
import { emptyState } from '#kit/empty';       // emptyState({ title, body? }) -> '<div class="kit-empty"><p class="kit-empty__title">title</p></div>'
```

`dataTable` escapes plain cells (`row[key]`) and the `sortHref` result itself, so `&` in a sort link renders as `&amp;`. `render` output is trusted HTML. `badge` escapes its label.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module that integrates six kit components. The plan has the full content, but the test surface is wide.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit functions listed above (unchanged).
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`. It returns the page body HTML, without the layout. Task 2 wires it into `ROUTES` exactly like `renderServices`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in start-time order, so the default sort is really tested.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-0', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'dana' },
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Asserts the services appear in this row order.
function assertOrder(html, services) {
  const positions = services.map((s) => html.indexOf(`<td>${s}</td>`));
  assert.ok(positions.every((p) => p >= 0), `missing a row: ${services}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `order: ${services}`);
}

test('shows the header with the snapshot time under it', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(html.includes('<h1>Deploys</h1><p class="kit-muted">Snapshot from 2026-10-01T09:30:00Z</p>'));
});

test('lists deploys newest first by default, with the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['search', 'notifications', 'api-gateway', 'billing']);
  assert.ok(html.includes('<th aria-sort="descending"><a href="?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼</a></th>'));
  const headers = [...html.matchAll(/<th[^>]*>(?:<a[^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('only Service and Started are sortable', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(html.includes('<th><a href="?env=all&amp;sort=service&amp;dir=asc">Service</a></th>'));
  for (const label of ['Version', 'Environment', 'Status', 'Duration', 'Author']) {
    assert.ok(html.includes(`<th>${label}</th>`), label);
  }
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(asc, ['api-gateway', 'billing', 'notifications', 'search']);
  assert.ok(asc.includes('<th aria-sort="ascending"><a href="?env=all&amp;sort=service&amp;dir=desc">Service ▲</a></th>'));
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(desc, ['search', 'notifications', 'billing', 'api-gateway']);
  assert.ok(desc.includes('<th aria-sort="descending"><a href="?env=all&amp;sort=service&amp;dir=asc">Service ▼</a></th>'));
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(html, ['billing', 'api-gateway', 'notifications', 'search']);
  assert.ok(html.includes('<th aria-sort="ascending"><a href="?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲</a></th>'));
});

test('the filter auto-submits and keeps the current sort', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(html.includes('<form class="kit-filter-bar" method="get" action="/deploys">'));
  assert.ok(html.includes('<select name="env" class="kit-select" data-autosubmit>'));
  assert.ok(html.includes('<option value="all" selected>All environments</option><option value="production">production</option><option value="staging">staging</option>'));
  assert.ok(html.includes('<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">'));
});

test('filters by environment and keeps it in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.ok(html.includes('<option value="production" selected>production</option>'));
  assertOrder(html, ['notifications', 'api-gateway']);
  assert.ok(!html.includes('<td>search</td>'));
  assert.ok(!html.includes('<td>billing</td>'));
  assert.ok(html.includes('href="?env=production&amp;sort=service&amp;dir=asc"'));
  assert.ok(html.includes('href="?env=production&amp;sort=startedAt&amp;dir=asc"'));
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(html.includes('<td><span class="kit-badge kit-badge--ok">succeeded</span></td>'));
  assert.ok(html.includes('<td><span class="kit-badge kit-badge--bad">failed</span></td>'));
  assert.ok(html.includes('<td><span class="kit-badge kit-badge--warn">rolled-back</span></td>'));
  assert.ok(html.includes('<td><span class="kit-badge kit-badge--info">in-progress</span></td>'));
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(html.includes('<td>4m 12s</td>'));
  assert.ok(html.includes('<td>21m 40s</td>'));
  assert.ok(html.includes('<td>2m 30s</td>'));
  assert.ok(html.includes('<td>running</td>'));
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.ok(html.includes('<p class="kit-empty__title">No deploys in staging</p>'));
  assert.ok(!html.includes('<table'));
  assert.ok(html.includes('<option value="staging" selected>staging</option>'), 'the filter stays so you can switch back');
});

test('says "No deploys" when the snapshot is empty and no environment is chosen', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.ok(html.includes('<p class="kit-empty__title">No deploys</p>'));
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.ok(html.includes('<option value="all" selected>All environments</option>'));
  assert.ok(html.includes('<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">'));
  assertOrder(html, ['search', 'notifications', 'api-gateway', 'billing']);
  const serviceOnly = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assertOrder(serviceOnly, ['api-gateway', 'billing', 'notifications', 'search']);
});

test('escapes snapshot values', () => {
  const evil = { ...snapshot, deploys: [{ ...snapshot.deploys[0], author: '<b>x</b>' }] };
  const html = renderDeploys(evil, {});
  assert.ok(html.includes('<td>&lt;b&gt;x&lt;/b&gt;</td>'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL. The test file cannot load, with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest
// first; a service sort without a direction runs A to Z).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  let deploys = snapshot.deploys;
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

  // The sort links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot from ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// Minutes and seconds, such as "4m 12s"; an unfinished deploy is "running".
function duration(deploy) {
  if (deploy.status === 'in-progress' || !deploy.finishedAt) return 'running';
  const ms = Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt);
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 13 tests.

Then run the full suite: `npm test`
Expected: PASS (18 existing + 13 new = 31).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration touching the shared router and layout that every page uses.

**Files:**
- Modify: `src/server.js` (imports block, `ROUTES`)
- Modify: `src/layout.js` (`NAV`)
- Modify: `README.md` ("Pages" section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1). Also `handle(url, { dataDir })` from `src/server.js`, unchanged.
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or 503 "Snapshot unavailable".

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, change the imports at the top to:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Change the nav test's path list to include `/deploys`:

```js
test('serves every page in the nav', async () => {
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
    assert.equal((await handle(path)).status, 200, path);
  }
});
```

Add these tests after `renders the services page inside the layout`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.doesNotMatch(res.body, /<td>0\.9\.4<\/td>/);
});

test('puts Deploys in the nav right after Services', async () => {
  const { body } = await handle('/');
  assert.match(body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a><a href="\/incidents">/);
});

test('answers 503 when the deploys snapshot is missing or unreadable', async () => {
  const missing = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const gone = await handle('/deploys', { dataDir: missing });
  assert.equal(gone.status, 503);
  assert.match(gone.body, /<h1>Deploys<\/h1>/);
  assert.match(gone.body, /Snapshot unavailable/);

  const dir = await mkdtemp(join(tmpdir(), 'harbor-'));
  try {
    await writeFile(join(dir, 'deploys.json'), '{"generatedAt": "2026-10-01T09');
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
Expected: FAIL. `serves every page in the nav` fails on `/deploys` (404 ≠ 200). `renders the deploys page…` fails with status 404. The nav-order test fails. The 503 test fails because `/deploys` answers 404.

- [ ] **Step 3: Wire the route and the nav link**

In `src/server.js`, add the import in alphabetical order, between `escapeHtml`/`layout` and `renderIncidents`:

```js
import { layout } from './layout.js';
import { renderDeploys } from './pages/deploys.js';
import { renderIncidents } from './pages/incidents.js';
```

and add the route after `/services`:

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

Do not touch the 503 handling in `handle`. It already covers a missing file (`readFile` rejects) and a torn file (`JSON.parse` throws inside the same `try`).

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

In `README.md`, replace the first sentence of the "Pages" section:

```markdown
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
`src/pages/`.
```

(Keep the rest of that paragraph, starting at "`src/server.js` routes requests…", unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 8 tests.

Then: `npm test`
Expected: PASS, 34 tests, 0 failures.

- [ ] **Step 5: Check it in the browser**

Run `npm start` and open `http://localhost:3000/deploys`. Check that:
- "Deploys" appears in the nav after "Services" and is marked current.
- The rows run newest first: search 1.23.0-rc.1 at the top, with a blue "in-progress" chip and "running".
- The notifications 0.9.3 row has an amber "rolled-back" chip and "21m 40s".
- Choosing "staging" in the dropdown reloads the page as `?env=staging&sort=startedAt&dir=desc`.
- Clicking "Service" then gives `?env=staging&sort=service&dir=asc`, with the filter kept.

Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Deploys: add the /deploys route and nav link"
```
