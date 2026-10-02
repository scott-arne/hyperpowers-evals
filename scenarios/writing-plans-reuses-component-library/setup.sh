#!/usr/bin/env bash
set -euo pipefail

# Fixture: Harbor, a server-rendered Node dashboard with no dependencies. It
# was started from an admin template whose component library is vendored in
# src/ui/ (a sortable data table, a labeled select, a filter form, a status
# chip, an empty state, a card and a page header). The Overview page uses the
# card, chip and header. The Services page, the existing page most like the
# new one, was written by hand: its own <table>, its own <select>, its own chip
# classes and its own escaping helper. No page uses the library's table or
# select.
#
# The spec on disk describes a new Deploys page: an environment dropdown, a
# sortable table, colored status chips and an empty state. Every one of those
# exists in the library, and the spec does not say how to build them.
#
# The field failure this reproduces (predict-before-structure, 2026-09): plans
# built their markup by copying whichever existing page the planner happened
# to read, and never looked in the component library, so hand-written tables
# and selects spread page by page. docs/hyperpowers/ is gitignored, as it was
# there.
#
# Regenerated deterministically on every run; nothing here is random.

setup-helpers run create_base_repo

git rm -q src/index.js src/utils.js
mkdir -p src/ui public

# --- The template's component library -------------------------------------

cat > src/ui/escape.js <<'JS'
// Escapes text for HTML element content and quoted attribute values.
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
JS

cat > src/ui/table.js <<'JS'
import { esc } from './escape.js';

/**
 * Data table.
 *
 * @param {object} opts
 * @param {Array<{key: string, label: string, sortable?: boolean,
 *   render?: (row: object) => string, value?: (row: object) => unknown}>} opts.columns
 *   `render` returns trusted HTML for the cell; without it the cell shows the
 *   escaped `row[key]`. `value` is what sorting compares (default `row[key]`).
 * @param {object[]} opts.rows
 * @param {{key: string, dir: 'asc' | 'desc'}} [opts.sort] The active sort; rows
 *   are sorted by it.
 * @param {(key: string, dir: 'asc' | 'desc') => string} [opts.sortHref] Link for
 *   a sortable header. Without it, headers are plain text.
 * @param {string} [opts.empty] Trusted HTML shown instead of the table when
 *   there are no rows.
 * @returns {string}
 */
export function dataTable({
  columns,
  rows,
  sort,
  sortHref,
  empty = '<p class="ui-muted">Nothing to show.</p>',
}) {
  if (rows.length === 0) return empty;
  const sorted = sort ? sortRows(rows, columns, sort) : rows;
  const head = columns.map((col) => headerCell(col, sort, sortHref)).join('');
  const body = sorted
    .map((row) => {
      const cells = columns
        .map((col) => `<td>${col.render ? col.render(row) : esc(row[col.key])}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('\n');
  return `<table class="ui-table">
<thead><tr>${head}</tr></thead>
<tbody>
${body}
</tbody>
</table>`;
}

function headerCell(col, sort, sortHref) {
  const label = esc(col.label);
  if (!col.sortable || !sortHref) return `<th>${label}</th>`;
  const active = sort?.key === col.key;
  const next = active && sort.dir === 'asc' ? 'desc' : 'asc';
  const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  const aria = active
    ? ` aria-sort="${sort.dir === 'asc' ? 'ascending' : 'descending'}"`
    : '';
  return `<th${aria}><a href="${esc(sortHref(col.key, next))}">${label}${arrow}</a></th>`;
}

function sortRows(rows, columns, sort) {
  const col = columns.find((c) => c.key === sort.key);
  if (!col) return rows;
  const get = col.value ?? ((row) => row[col.key]);
  const factor = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => factor * compare(get(a), get(b)));
}

function compare(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''));
}
JS

cat > src/ui/select.js <<'JS'
import { esc } from './escape.js';

/**
 * Labeled select. Inside a `filterBar`, changing it submits the bar's form.
 *
 * @param {object} opts
 * @param {string} opts.name Query parameter name.
 * @param {string} opts.label
 * @param {Array<{value: string, label: string}>} opts.options
 * @param {string} [opts.value] The selected value.
 * @returns {string}
 */
export function selectField({ name, label, options, value }) {
  const items = options
    .map((o) => {
      const selected = o.value === value ? ' selected' : '';
      return `<option value="${esc(o.value)}"${selected}>${esc(o.label)}</option>`;
    })
    .join('');
  return `<label class="ui-field"><span class="ui-field__label">${esc(label)}</span><select name="${esc(name)}" class="ui-select" data-autosubmit>${items}</select></label>`;
}
JS

cat > src/ui/filter-bar.js <<'JS'
import { esc } from './escape.js';

/**
 * A GET form for a page's filters. `fields` is trusted HTML, usually
 * `selectField` output; public/harbor.js submits the form when a field marked
 * `data-autosubmit` changes. `keep` carries query state the bar should not
 * drop, such as the current sort.
 *
 * @param {object} opts
 * @param {string} opts.action
 * @param {string[]} opts.fields
 * @param {Record<string, string | undefined>} [opts.keep]
 * @returns {string}
 */
export function filterBar({ action, fields, keep = {} }) {
  const hidden = Object.entries(keep)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('');
  return `<form class="ui-filter-bar" method="get" action="${esc(action)}">${fields.join('')}${hidden}</form>`;
}
JS

cat > src/ui/chip.js <<'JS'
import { esc } from './escape.js';

const TONES = new Set(['ok', 'warn', 'bad', 'info', 'muted']);

/**
 * Status chip. Map your domain's states to a tone at the call site.
 *
 * @param {string} label
 * @param {'ok' | 'warn' | 'bad' | 'info' | 'muted'} [tone]
 * @returns {string}
 */
export function statusChip(label, tone = 'muted') {
  const t = TONES.has(tone) ? tone : 'muted';
  return `<span class="ui-chip ui-chip--${t}">${esc(label)}</span>`;
}
JS

cat > src/ui/empty-state.js <<'JS'
import { esc } from './escape.js';

/**
 * Placeholder for a list or panel with nothing to show.
 *
 * @param {{title: string, body?: string}} opts `body` is trusted HTML.
 * @returns {string}
 */
export function emptyState({ title, body = '' }) {
  const more = body ? `<div class="ui-empty__body">${body}</div>` : '';
  return `<div class="ui-empty"><p class="ui-empty__title">${esc(title)}</p>${more}</div>`;
}
JS

cat > src/ui/card.js <<'JS'
import { esc } from './escape.js';

/**
 * Content card.
 *
 * @param {{title: string, body: string, footer?: string}} opts `body` and
 *   `footer` are trusted HTML.
 * @returns {string}
 */
export function card({ title, body, footer = '' }) {
  const foot = footer ? `<footer class="ui-card__footer">${footer}</footer>` : '';
  return `<section class="ui-card"><h2 class="ui-card__title">${esc(title)}</h2><div class="ui-card__body">${body}</div>${foot}</section>`;
}
JS

cat > src/ui/page-header.js <<'JS'
import { esc } from './escape.js';

/**
 * Page title row.
 *
 * @param {{title: string, subtitle?: string, actions?: string}} opts
 *   `actions` is trusted HTML.
 * @returns {string}
 */
export function pageHeader({ title, subtitle = '', actions = '' }) {
  const sub = subtitle ? `<p class="ui-muted">${esc(subtitle)}</p>` : '';
  const act = actions ? `<div class="ui-page-header__actions">${actions}</div>` : '';
  return `<header class="ui-page-header"><div><h1>${esc(title)}</h1>${sub}</div>${act}</header>`;
}
JS

cat > src/ui/index.js <<'JS'
// Harbor admin template components, vendored from the template. Keep local
// edits small so template updates still apply.
export { card } from './card.js';
export { statusChip } from './chip.js';
export { emptyState } from './empty-state.js';
export { esc } from './escape.js';
export { filterBar } from './filter-bar.js';
export { pageHeader } from './page-header.js';
export { selectField } from './select.js';
export { dataTable } from './table.js';
JS

cat > public/harbor.js <<'JS'
// Submits a filter bar's form when one of its auto-submit fields changes.
document.addEventListener('change', (event) => {
  const field = event.target.closest('[data-autosubmit]');
  if (field && field.form) field.form.submit();
});
JS

cat > public/harbor.css <<'CSS'
/* Harbor admin template */
:root { --ok: #1a7f37; --warn: #9a6700; --bad: #cf222e; --info: #0969da; --muted: #57606a; }
body { margin: 0; font: 14px/1.5 system-ui, sans-serif; color: #1f2328; }
.ui-nav { display: flex; gap: 1rem; padding: .75rem 1.5rem; background: #24292f; }
.ui-nav a { color: #f6f8fa; text-decoration: none; }
.ui-nav a[aria-current="page"] { font-weight: 600; text-decoration: underline; }
.ui-main { padding: 1.5rem; }
.ui-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem; }
.ui-page-header h1 { margin: 0; font-size: 1.5rem; }
.ui-muted { color: var(--muted); margin: 0; }
.ui-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 1rem; }
.ui-card { border: 1px solid #d0d7de; border-radius: 6px; padding: 1rem; }
.ui-card__title { margin: 0 0 .5rem; font-size: 1rem; text-transform: capitalize; }
.ui-card__footer { margin-top: .75rem; }
.ui-table { width: 100%; border-collapse: collapse; }
.ui-table th, .ui-table td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #d0d7de; }
.ui-table th a { color: inherit; }
.ui-filter-bar { display: flex; gap: 1rem; margin-bottom: 1rem; }
.ui-field { display: flex; flex-direction: column; gap: .25rem; }
.ui-field__label { font-size: .75rem; color: var(--muted); }
.ui-select { padding: .25rem .5rem; }
.ui-chip { display: inline-block; padding: 0 .5rem; border-radius: 1rem; font-size: .75rem; color: #fff; }
.ui-chip--ok { background: var(--ok); }
.ui-chip--warn { background: var(--warn); }
.ui-chip--bad { background: var(--bad); }
.ui-chip--info { background: var(--info); }
.ui-chip--muted { background: var(--muted); }
.ui-empty { padding: 2rem; text-align: center; color: var(--muted); }
.ui-empty__title { font-weight: 600; margin: 0; }
CSS

git add src/ui public
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Start from the Harbor admin template"

# --- The dashboard ---------------------------------------------------------

mkdir -p src/pages data test/ui test/pages

cat > package.json <<'JSON'
{
  "name": "harbor",
  "version": "0.7.0",
  "description": "Ops dashboard for the services we run",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test"
  }
}
JSON

cat > README.md <<'MD'
# Harbor

Ops dashboard for the services we run. It renders pages on the server from
the snapshots the deploy pipeline writes to `data/` every minute; it never
talks to the services itself.

## Running

    npm start        # http://localhost:3000
    npm test

No dependencies; Node 20 or later.

## Layout

- `src/server.js` routes requests and wraps each page in `src/layout.js`.
- `src/pages/` has one module per page.
- `src/ui/` is the component library from the Harbor admin template the
  dashboard was started from.
- `public/` holds the template's stylesheet and script (`harbor.css`,
  `harbor.js`) and the dashboard's own stylesheet (`app.css`).
- `data/` holds the pipeline's snapshots.
MD

cat > .gitignore <<'TXT'
node_modules/
docs/hyperpowers/
TXT

cat > src/data.js <<'JS'
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));

// The deploy pipeline writes these snapshots every minute; the dashboard only
// reads them.
export async function readSnapshot(name, dir = DATA_DIR) {
  return JSON.parse(await readFile(join(dir, `${name}.json`), 'utf8'));
}
JS

cat > src/layout.js <<'JS'
import { esc } from './ui/index.js';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
];

export function layout({ title, active, body }) {
  const nav = NAV.map((item) => {
    const current = item.href === active ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${current}>${esc(item.label)}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)} · Harbor</title>
<link rel="stylesheet" href="/public/harbor.css">
<link rel="stylesheet" href="/public/app.css">
<script src="/public/harbor.js" defer></script>
</head>
<body>
<nav class="ui-nav">${nav}</nav>
<main class="ui-main">
${body}
</main>
</body>
</html>`;
}
JS

cat > src/pages/overview.js <<'JS'
import { card, pageHeader, statusChip } from '../ui/index.js';

// One card per environment, counting the services that are not passing their
// health checks.
export function renderOverview(snapshot) {
  const environments = [...new Set(snapshot.services.map((s) => s.environment))].sort();
  const cards = environments.map((env) => {
    const services = snapshot.services.filter((s) => s.environment === env);
    const unhealthy = services.filter((s) => s.health !== 'passing').length;
    const chip =
      unhealthy === 0
        ? statusChip('all passing', 'ok')
        : statusChip(`${unhealthy} not passing`, 'bad');
    return card({
      title: env,
      body: `<p>${services.length} services</p>${chip}`,
      footer: `<a href="/services?env=${encodeURIComponent(env)}">View services</a>`,
    });
  });
  return `${pageHeader({ title: 'Overview', subtitle: `Snapshot ${snapshot.generatedAt}` })}
<div class="ui-grid">
${cards.join('\n')}
</div>`;
}
JS

cat > src/pages/services.js <<'JS'
// Services list. Filter with ?env=production|staging, sort with
// ?sort=name|deployedAt (newest deploy first).
const ENVIRONMENTS = ['production', 'staging'];

export function renderServices(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = query.sort === 'deployedAt' ? 'deployedAt' : 'name';

  let services = snapshot.services;
  if (env !== 'all') services = services.filter((s) => s.environment === env);
  services = [...services].sort(
    sort === 'name'
      ? (a, b) => a.name.localeCompare(b.name) || a.environment.localeCompare(b.environment)
      : (a, b) => b.deployedAt.localeCompare(a.deployedAt),
  );

  const options = ['all', ...ENVIRONMENTS]
    .map((e) => {
      const selected = e === env ? ' selected' : '';
      return `<option value="${e}"${selected}>${e === 'all' ? 'All environments' : e}</option>`;
    })
    .join('');

  const rows = services
    .map(
      (s) => `<tr>
  <td>${escapeHtml(s.name)}</td>
  <td>${escapeHtml(s.version)}</td>
  <td>${escapeHtml(s.environment)}</td>
  <td><span class="pill ${healthClass(s.health)}">${escapeHtml(s.health)}</span></td>
  <td>${escapeHtml(s.deployedAt)}</td>
</tr>`,
    )
    .join('\n');

  const list =
    services.length === 0
      ? '<p class="muted">No services in this environment.</p>'
      : `<table class="services">
<thead><tr>
  <th><a href="?env=${env}&amp;sort=name">Name</a></th>
  <th>Version</th>
  <th>Environment</th>
  <th>Health</th>
  <th><a href="?env=${env}&amp;sort=deployedAt">Deployed</a></th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Services</h1>
<form method="get" action="/services" class="filters">
  <label>Environment
    <select name="env" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
</form>
${list}`;
}

function healthClass(health) {
  if (health === 'passing') return 'pill-green';
  if (health === 'degraded') return 'pill-amber';
  return 'pill-red';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
JS

cat > src/server.js <<'JS'
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSnapshot } from './data.js';
import { layout } from './layout.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
import { pageHeader } from './ui/index.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.css': 'text/css', '.js': 'text/javascript' };

const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
};

// Resolves one request to a response. Kept apart from the http server so
// tests can call it directly.
export async function handle(url, { dataDir } = {}) {
  const { pathname, searchParams } = new URL(url, 'http://harbor.local');
  if (pathname.startsWith('/public/')) return serveStatic(pathname.slice('/public/'.length));
  const route = ROUTES[pathname];
  if (!route) return page(404, 'Not found', '<h1>Not found</h1>', pathname);
  let snapshot;
  try {
    snapshot = await readSnapshot(route.snapshot, dataDir);
  } catch {
    // The pipeline rewrites snapshots in place, so a read can fail for a
    // moment. Say so instead of crashing; the next refresh usually works.
    const body = pageHeader({
      title: route.title,
      subtitle: 'Snapshot unavailable, try again in a minute.',
    });
    return page(503, route.title, body, pathname);
  }
  return page(200, route.title, route.render(snapshot, Object.fromEntries(searchParams)), pathname);
}

function page(status, title, body, active) {
  return { status, type: 'text/html; charset=utf-8', body: layout({ title, active, body }) };
}

async function serveStatic(name) {
  const type = TYPES[extname(name)];
  if (name.includes('..') || !type) return { status: 404, type: 'text/plain', body: 'Not found' };
  try {
    return { status: 200, type, body: await readFile(join(PUBLIC_DIR, name), 'utf8') };
  } catch {
    return { status: 404, type: 'text/plain', body: 'Not found' };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  createServer(async (req, res) => {
    const out = await handle(req.url);
    res.writeHead(out.status, { 'content-type': out.type });
    res.end(out.body);
  }).listen(port, () => console.log(`harbor on http://localhost:${port}`));
}
JS

cat > public/app.css <<'CSS'
/* Harbor dashboard styles that are not part of the template */
.filters { margin-bottom: 1rem; }
.filters select { margin-left: .5rem; }
.services { width: 100%; border-collapse: collapse; }
.services th, .services td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #ddd; }
.pill { display: inline-block; padding: 0 .5rem; border-radius: 1rem; font-size: .75rem; color: #fff; }
.pill-green { background: #2da44e; }
.pill-amber { background: #bf8700; }
.pill-red { background: #cf222e; }
.muted { color: #6e7781; }
CSS

cat > data/services.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "services": [
    { "name": "api-gateway", "version": "3.14.2", "environment": "production", "health": "passing", "deployedAt": "2026-09-30T16:05:00Z" },
    { "name": "billing", "version": "2.8.0", "environment": "production", "health": "degraded", "deployedAt": "2026-09-29T11:40:00Z" },
    { "name": "notifications", "version": "0.9.4", "environment": "production", "health": "failing", "deployedAt": "2026-10-01T08:50:00Z" },
    { "name": "search", "version": "1.22.1", "environment": "production", "health": "passing", "deployedAt": "2026-09-28T09:15:00Z" },
    { "name": "api-gateway", "version": "3.15.0-rc.1", "environment": "staging", "health": "passing", "deployedAt": "2026-10-01T07:20:00Z" },
    { "name": "billing", "version": "2.9.0-rc.2", "environment": "staging", "health": "passing", "deployedAt": "2026-09-30T14:00:00Z" },
    { "name": "search", "version": "1.23.0-rc.1", "environment": "staging", "health": "failing", "deployedAt": "2026-10-01T09:05:00Z" }
  ]
}
JSON

cat > test/ui/table.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dataTable } from '../../src/ui/table.js';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'count', label: 'Count', sortable: true },
];
const rows = [
  { name: 'beta', count: 2 },
  { name: 'alpha', count: 10 },
];

test('sorts rows by the active sort', () => {
  const html = dataTable({ columns, rows, sort: { key: 'count', dir: 'desc' } });
  assert.ok(html.indexOf('alpha') < html.indexOf('beta'));
});

test('links sortable headers and flips the active direction', () => {
  const html = dataTable({
    columns,
    rows,
    sort: { key: 'name', dir: 'asc' },
    sortHref: (key, dir) => `?sort=${key}&dir=${dir}`,
  });
  assert.match(html, /<th aria-sort="ascending"><a href="\?sort=name&amp;dir=desc">Name ▲<\/a><\/th>/);
  assert.match(html, /<a href="\?sort=count&amp;dir=asc">Count<\/a>/);
});

test('shows the empty content instead of a table when there are no rows', () => {
  assert.equal(dataTable({ columns, rows: [], empty: '<p>none</p>' }), '<p>none</p>');
});

test('escapes cell text unless the column renders it', () => {
  const html = dataTable({
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'n', label: 'N', render: (r) => `<b>${r.n}</b>` },
    ],
    rows: [{ name: '<script>', n: 1 }],
  });
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<b>1<\/b>/);
});
JS

cat > test/ui/select.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterBar, selectField } from '../../src/ui/index.js';

test('marks the selected option', () => {
  const html = selectField({
    name: 'env',
    label: 'Environment',
    options: [
      { value: '', label: 'All' },
      { value: 'staging', label: 'staging' },
    ],
    value: 'staging',
  });
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<option value="">All<\/option>/);
});

test('filterBar carries kept query values in hidden inputs', () => {
  const html = filterBar({ action: '/x', fields: ['<i>f</i>'], keep: { sort: 'name', dir: '' } });
  assert.match(html, /^<form class="ui-filter-bar" method="get" action="\/x"><i>f<\/i>/);
  assert.match(html, /<input type="hidden" name="sort" value="name">/);
  assert.doesNotMatch(html, /name="dir"/);
});
JS

cat > test/ui/chip.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyState, statusChip } from '../../src/ui/index.js';

test('statusChip uses the tone class', () => {
  assert.equal(statusChip('ok', 'ok'), '<span class="ui-chip ui-chip--ok">ok</span>');
});

test('statusChip falls back to muted for an unknown tone', () => {
  assert.match(statusChip('x', 'purple'), /ui-chip--muted/);
});

test('emptyState escapes its title', () => {
  assert.match(emptyState({ title: 'a < b' }), /a &lt; b/);
});
JS

cat > test/pages/overview.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderOverview } from '../../src/pages/overview.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  services: [
    { name: 'a', version: '1', environment: 'production', health: 'failing', deployedAt: '2026-09-01T00:00:00Z' },
    { name: 'b', version: '1', environment: 'production', health: 'passing', deployedAt: '2026-09-01T00:00:00Z' },
    { name: 'a', version: '2', environment: 'staging', health: 'passing', deployedAt: '2026-09-02T00:00:00Z' },
  ],
};

test('counts the services not passing in each environment', () => {
  const html = renderOverview(snapshot);
  assert.match(html, /ui-chip--bad">1 not passing</);
  assert.match(html, /ui-chip--ok">all passing</);
  assert.match(html, /href="\/services\?env=staging"/);
});
JS

cat > test/pages/services.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderServices } from '../../src/pages/services.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  services: [
    { name: 'billing', version: '2.8.0', environment: 'production', health: 'failing', deployedAt: '2026-09-29T11:40:00Z' },
    { name: 'api', version: '3.1.0', environment: 'production', health: 'passing', deployedAt: '2026-09-30T16:05:00Z' },
  ],
};

test('lists services by name by default', () => {
  const html = renderServices(snapshot, {});
  assert.ok(html.indexOf('<td>api</td>') < html.indexOf('<td>billing</td>'));
});

test('sorts newest deploy first', () => {
  const html = renderServices(snapshot, { sort: 'deployedAt' });
  assert.ok(html.indexOf('<td>api</td>') < html.indexOf('<td>billing</td>'));
  assert.match(html, /<input type="hidden" name="sort" value="deployedAt">/);
});

test('colors health', () => {
  assert.match(renderServices(snapshot, {}), /<span class="pill pill-red">failing<\/span>/);
});

test('filters by environment and says when none match', () => {
  const html = renderServices(snapshot, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>/);
  assert.match(html, /No services in this environment\./);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to all environments for an unknown env', () => {
  assert.match(renderServices(snapshot, { env: 'moon' }), /<option value="all" selected>/);
});
JS

cat > test/server.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';

test('renders the services page inside the layout', async () => {
  const res = await handle('/services?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Services · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Services</);
  assert.match(res.body, /<td>notifications<\/td>/);
});

test('answers 503 when the snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 404 for an unknown path', async () => {
  assert.equal((await handle('/nope')).status, 404);
});

test('serves the template assets', async () => {
  const res = await handle('/public/harbor.css');
  assert.equal(res.status, 200);
  assert.equal(res.type, 'text/css');
});
JS

git add package.json README.md .gitignore src public data/services.json test
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Add overview and services pages"

cat > data/deploys.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" },
    { "id": "d-1041", "service": "notifications", "version": "0.9.4", "environment": "production", "status": "succeeded", "startedAt": "2026-10-01T08:50:00Z", "finishedAt": "2026-10-01T08:54:12Z", "author": "marco" },
    { "id": "d-1040", "service": "notifications", "version": "0.9.3", "environment": "production", "status": "rolled-back", "startedAt": "2026-10-01T08:10:00Z", "finishedAt": "2026-10-01T08:31:40Z", "author": "marco" },
    { "id": "d-1039", "service": "api-gateway", "version": "3.15.0-rc.1", "environment": "staging", "status": "succeeded", "startedAt": "2026-10-01T07:20:00Z", "finishedAt": "2026-10-01T07:26:05Z", "author": "dana" },
    { "id": "d-1038", "service": "billing", "version": "2.9.0-rc.3", "environment": "staging", "status": "failed", "startedAt": "2026-10-01T06:45:00Z", "finishedAt": "2026-10-01T06:47:30Z", "author": "sam" },
    { "id": "d-1037", "service": "api-gateway", "version": "3.14.2", "environment": "production", "status": "succeeded", "startedAt": "2026-09-30T16:05:00Z", "finishedAt": "2026-09-30T16:12:48Z", "author": "dana" },
    { "id": "d-1036", "service": "billing", "version": "2.9.0-rc.2", "environment": "staging", "status": "succeeded", "startedAt": "2026-09-30T14:00:00Z", "finishedAt": "2026-09-30T14:04:21Z", "author": "sam" },
    { "id": "d-1035", "service": "search", "version": "1.22.2", "environment": "production", "status": "failed", "startedAt": "2026-09-30T10:30:00Z", "finishedAt": "2026-09-30T10:33:02Z", "author": "priya" },
    { "id": "d-1034", "service": "billing", "version": "2.8.0", "environment": "production", "status": "succeeded", "startedAt": "2026-09-29T11:40:00Z", "finishedAt": "2026-09-29T11:49:55Z", "author": "sam" },
    { "id": "d-1033", "service": "search", "version": "1.22.1", "environment": "production", "status": "succeeded", "startedAt": "2026-09-28T09:15:00Z", "finishedAt": "2026-09-28T09:19:37Z", "author": "priya" }
  ]
}
JSON

git add data/deploys.json
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Pipeline: add the deploys snapshot"

git checkout -q -b feature/deploys-page

# The spec stays on disk and out of git: docs/hyperpowers/ is gitignored.
mkdir -p docs/hyperpowers/specs
cat > docs/hyperpowers/specs/2026-10-01-deploys-page-design.md <<'MD'
# Deploys Page Design

**Date:** 2026-10-01
**Status:** Approved

## Goal

Whoever is on call can see recent deploys on the dashboard and spot a failed
or rolled-back one without opening the pipeline.

## Scope

A new read-only page at `/deploys`, with a "Deploys" link in the nav after
"Services". Out of scope: a deploy details page, pagination (the snapshot
keeps the last 50 deploys), live refresh, and any action on a deploy.

## Data

The deploy pipeline already writes `data/deploys.json` every minute, next to
`services.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    {
      "id": "d-1042",
      "service": "search",
      "version": "1.23.0-rc.1",
      "environment": "staging",
      "status": "in-progress",
      "startedAt": "2026-10-01T09:05:00Z",
      "finishedAt": null,
      "author": "priya"
    }
  ]
}
```

`status` is one of `succeeded`, `failed`, `rolled-back` or `in-progress`.
`finishedAt` is null while a deploy is in progress.

## Page

- **Header:** "Deploys", with the snapshot time under it.
- **Environment filter:** a dropdown with "All environments" (the default),
  "production" and "staging". Choosing one reloads the page with `?env=`,
  keeping the current sort.
- **Table:** one row per deploy, with the columns Service, Version,
  Environment, Status, Started, Duration and Author. Newest first by default.
  Service and Started can be sorted both ways through `?sort=` and `?dir=`;
  changing the sort keeps the filter.
- **Status:** a colored chip. Succeeded is green, failed red, rolled-back
  amber, in-progress blue.
- **Duration:** `finishedAt` minus `startedAt` in minutes and seconds, such
  as "4m 12s". An in-progress deploy shows "running".
- **Empty:** when the filter matches no deploys, the page says "No deploys in
  staging" (naming the chosen environment) in place of the table.

## Errors

A missing or unreadable `deploys.json` gets the same 503 "Snapshot
unavailable" page as the other pages. An unknown `env`, `sort` or `dir` value
falls back to the default.

## Testing

`node --test`, like the rest of the repository: rendering tests for the
filter, both sorts, the chips, the duration format, the empty state and the
fallback for unknown query values, plus a server test for the route and its
503.
MD
