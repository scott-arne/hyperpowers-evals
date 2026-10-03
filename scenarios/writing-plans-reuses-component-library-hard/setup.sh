#!/usr/bin/env bash
set -euo pipefail

# Fixture: Harbor again, rebuilt so that nothing on the obvious reading path
# shows the component library. It is the harder sibling of
# writing-plans-reuses-component-library, whose plans all used the library at
# both hyperpowers versions tried (evidence/2026-10-02-plans-component-library-
# baseline and -612): there the README named the library, one page used it,
# and the whole repository fit in one read.
#
# Here the dashboard was started from the Keel admin template, whose kit is
# vendored as one directory per component under vendor/kit/<name>/src/, the
# layout Spartan's helm uses. Pages reach it through package.json subpath
# imports (#kit/<name>), the way an Angular app reaches a vendored helm through
# tsconfig paths. The kit has twelve components, among them a sortable data
# table, a labeled select, a filter bar, a badge, an empty state, a card and a
# page header. Five pages exist. Every one of them imports only the kit's
# button and dialog and hand-writes everything else: panels, tables, selects,
# pills and empty messages, with the dashboard's own escaping helper. The
# README does not mention the kit. The spec says the new page's sorting and
# filter behave as on the Services page, the hand-written page most like it.
#
# The field failure this reproduces (predict-before-structure, 2026-07 to
# 2026-10): pages imported only the vendored helm's button and dialog, the
# first page hand-wrote its cards, and later plans mirrored the nearest page,
# so the hand-written markup spread. docs/hyperpowers/ is gitignored, as it
# was there.
#
# Regenerated deterministically on every run; nothing here is random.

setup-helpers run create_base_repo

git rm -q src/index.js src/utils.js
for c in utils alert badge button card dialog empty filter-bar page-header select table tabs toggle-group; do
  mkdir -p "vendor/kit/$c/src/lib"
done
mkdir -p public

# --- The template's kit ----------------------------------------------------

cat > vendor/kit/utils/src/index.js <<'JS'
export { attrs, cx, esc } from './lib/utils.js';
JS

cat > vendor/kit/utils/src/lib/utils.js <<'JS'
// Escapes text for HTML element content and quoted attribute values.
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Joins class names, skipping falsy ones.
export function cx(...names) {
  return names.filter(Boolean).join(' ');
}

// Renders an attribute map as ` name="value"` pairs. true renders the bare
// attribute; false, null and undefined are left out.
export function attrs(map = {}) {
  return Object.entries(map)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k, v]) => (v === true ? ` ${esc(k)}` : ` ${esc(k)}="${esc(v)}"`))
    .join('');
}
JS

cat > vendor/kit/alert/src/index.js <<'JS'
export { alert } from './lib/alert.js';
JS

cat > vendor/kit/alert/src/lib/alert.js <<'JS'
import { esc } from '#kit/utils';

const TONES = new Set(['info', 'ok', 'warn', 'bad']);

/**
 * Inline alert.
 *
 * @param {{title: string, body?: string, tone?: 'info' | 'ok' | 'warn' | 'bad'}} opts
 *   `body` is trusted HTML.
 * @returns {string}
 */
export function alert({ title, body = '', tone = 'info' }) {
  const t = TONES.has(tone) ? tone : 'info';
  const more = body ? `<div class="kit-alert__body">${body}</div>` : '';
  const role = t === 'bad' ? 'alert' : 'status';
  return `<div class="kit-alert kit-alert--${t}" role="${role}"><p class="kit-alert__title">${esc(title)}</p>${more}</div>`;
}
JS

cat > vendor/kit/badge/src/index.js <<'JS'
export { badge } from './lib/badge.js';
JS

cat > vendor/kit/badge/src/lib/badge.js <<'JS'
import { esc } from '#kit/utils';

const TONES = new Set(['ok', 'warn', 'bad', 'info', 'muted']);

/**
 * Status badge. Map your domain's states to a tone at the call site.
 *
 * @param {string} label
 * @param {'ok' | 'warn' | 'bad' | 'info' | 'muted'} [tone]
 * @returns {string}
 */
export function badge(label, tone = 'muted') {
  const t = TONES.has(tone) ? tone : 'muted';
  return `<span class="kit-badge kit-badge--${t}">${esc(label)}</span>`;
}
JS

cat > vendor/kit/button/src/index.js <<'JS'
export { button } from './lib/button.js';
JS

cat > vendor/kit/button/src/lib/button.js <<'JS'
import { attrs, cx, esc } from '#kit/utils';

const VARIANTS = new Set(['primary', 'secondary', 'ghost', 'link']);

/**
 * Button, or a link styled as one when `href` is given.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} [opts.href]
 * @param {'primary' | 'secondary' | 'ghost' | 'link'} [opts.variant]
 * @param {'sm' | 'md'} [opts.size]
 * @param {'button' | 'submit'} [opts.type] For a `<button>` only.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes,
 *   such as `data-dialog-open`.
 * @returns {string}
 */
export function button({
  label,
  href,
  variant = 'primary',
  size = 'md',
  type = 'button',
  attrs: extra = {},
}) {
  const v = VARIANTS.has(variant) ? variant : 'primary';
  const cls = cx('kit-btn', `kit-btn--${v}`, size === 'sm' && 'kit-btn--sm');
  if (href) return `<a class="${cls}" href="${esc(href)}"${attrs(extra)}>${esc(label)}</a>`;
  const t = type === 'submit' ? 'submit' : 'button';
  return `<button class="${cls}" type="${t}"${attrs(extra)}>${esc(label)}</button>`;
}
JS

cat > vendor/kit/card/src/index.js <<'JS'
export { card } from './lib/card.js';
JS

cat > vendor/kit/card/src/lib/card.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Content card.
 *
 * @param {{title: string, body: string, footer?: string}} opts `body` and
 *   `footer` are trusted HTML.
 * @returns {string}
 */
export function card({ title, body, footer = '' }) {
  const foot = footer ? `<footer class="kit-card__footer">${footer}</footer>` : '';
  return `<section class="kit-card"><h2 class="kit-card__title">${esc(title)}</h2><div class="kit-card__body">${body}</div>${foot}</section>`;
}
JS

cat > vendor/kit/dialog/src/index.js <<'JS'
export { dialog } from './lib/dialog.js';
JS

cat > vendor/kit/dialog/src/lib/dialog.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Modal dialog. It stays closed until a control carrying
 * `data-dialog-open="<id>"` is clicked; public/kit.js opens it.
 *
 * @param {{id: string, title: string, body: string, actions?: string}} opts
 *   `body` and `actions` are trusted HTML.
 * @returns {string}
 */
export function dialog({ id, title, body, actions = '' }) {
  const foot = actions ? `<footer class="kit-dialog__actions">${actions}</footer>` : '';
  return `<dialog class="kit-dialog" id="${esc(id)}" aria-labelledby="${esc(id)}-title"><h2 class="kit-dialog__title" id="${esc(id)}-title">${esc(title)}</h2><div class="kit-dialog__body">${body}</div>${foot}<form method="dialog" class="kit-dialog__close"><button class="kit-btn kit-btn--ghost kit-btn--sm">Close</button></form></dialog>`;
}
JS

cat > vendor/kit/empty/src/index.js <<'JS'
export { emptyState } from './lib/empty.js';
JS

cat > vendor/kit/empty/src/lib/empty.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Placeholder for a list or panel with nothing to show.
 *
 * @param {{title: string, body?: string}} opts `body` is trusted HTML.
 * @returns {string}
 */
export function emptyState({ title, body = '' }) {
  const more = body ? `<div class="kit-empty__body">${body}</div>` : '';
  return `<div class="kit-empty"><p class="kit-empty__title">${esc(title)}</p>${more}</div>`;
}
JS

cat > vendor/kit/filter-bar/src/index.js <<'JS'
export { filterBar } from './lib/filter-bar.js';
JS

cat > vendor/kit/filter-bar/src/lib/filter-bar.js <<'JS'
import { esc } from '#kit/utils';

/**
 * A GET form for a page's filters. `fields` is trusted HTML, usually
 * `selectField` output; public/kit.js submits the form when a field marked
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
  return `<form class="kit-filter-bar" method="get" action="${esc(action)}">${fields.join('')}${hidden}</form>`;
}
JS

cat > vendor/kit/page-header/src/index.js <<'JS'
export { pageHeader } from './lib/page-header.js';
JS

cat > vendor/kit/page-header/src/lib/page-header.js <<'JS'
import { esc } from '#kit/utils';

/**
 * Page title row.
 *
 * @param {{title: string, subtitle?: string, actions?: string}} opts
 *   `actions` is trusted HTML.
 * @returns {string}
 */
export function pageHeader({ title, subtitle = '', actions = '' }) {
  const sub = subtitle ? `<p class="kit-muted">${esc(subtitle)}</p>` : '';
  const act = actions ? `<div class="kit-page-header__actions">${actions}</div>` : '';
  return `<header class="kit-page-header"><div><h1>${esc(title)}</h1>${sub}</div>${act}</header>`;
}
JS

cat > vendor/kit/select/src/index.js <<'JS'
export { selectField } from './lib/select.js';
JS

cat > vendor/kit/select/src/lib/select.js <<'JS'
import { esc } from '#kit/utils';

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
  return `<label class="kit-field"><span class="kit-field__label">${esc(label)}</span><select name="${esc(name)}" class="kit-select" data-autosubmit>${items}</select></label>`;
}
JS

cat > vendor/kit/table/src/index.js <<'JS'
export { dataTable } from './lib/table.js';
JS

cat > vendor/kit/table/src/lib/table.js <<'JS'
import { esc } from '#kit/utils';

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
  empty = '<p class="kit-muted">Nothing to show.</p>',
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
  return `<table class="kit-table">
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

cat > vendor/kit/tabs/src/index.js <<'JS'
export { tabs } from './lib/tabs.js';
JS

cat > vendor/kit/tabs/src/lib/tabs.js <<'JS'
import { esc } from '#kit/utils';

/**
 * A strip of tab links. The active tab gets `aria-current="page"`.
 *
 * @param {{label: string, items: Array<{href: string, label: string, active?: boolean}>}} opts
 * @returns {string}
 */
export function tabs({ label, items }) {
  const links = items
    .map((item) => {
      const current = item.active ? ' aria-current="page"' : '';
      return `<a class="kit-tabs__tab" href="${esc(item.href)}"${current}>${esc(item.label)}</a>`;
    })
    .join('');
  return `<nav class="kit-tabs" aria-label="${esc(label)}">${links}</nav>`;
}
JS

cat > vendor/kit/toggle-group/src/index.js <<'JS'
export { toggleGroup } from './lib/toggle-group.js';
JS

cat > vendor/kit/toggle-group/src/lib/toggle-group.js <<'JS'
import { esc } from '#kit/utils';

/**
 * A row of mutually exclusive link toggles, such as a view switch. The pressed
 * item gets `aria-pressed="true"`.
 *
 * @param {{label: string, items: Array<{href: string, label: string, pressed?: boolean}>}} opts
 * @returns {string}
 */
export function toggleGroup({ label, items }) {
  const links = items
    .map((item) => {
      const pressed = item.pressed ? 'true' : 'false';
      return `<a class="kit-toggle" role="button" href="${esc(item.href)}" aria-pressed="${pressed}">${esc(item.label)}</a>`;
    })
    .join('');
  return `<div class="kit-toggle-group" role="group" aria-label="${esc(label)}">${links}</div>`;
}
JS

cat > public/kit.js <<'JS'
// Opens a kit dialog from its trigger, and submits a filter bar's form when
// one of its auto-submit fields changes.
document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-dialog-open]');
  if (opener) document.getElementById(opener.dataset.dialogOpen)?.showModal();
});
document.addEventListener('change', (event) => {
  const field = event.target.closest('[data-autosubmit]');
  if (field && field.form) field.form.submit();
});
JS

cat > public/kit.css <<'CSS'
/* Keel admin template */
:root { --kit-ok: #1a7f37; --kit-warn: #9a6700; --kit-bad: #cf222e; --kit-info: #0969da; --kit-muted: #57606a; --kit-border: #d0d7de; }
.kit-muted { color: var(--kit-muted); margin: 0; }
.kit-btn { display: inline-block; padding: .35rem .8rem; border: 1px solid transparent; border-radius: 6px; font: inherit; text-decoration: none; cursor: pointer; }
.kit-btn--sm { padding: .15rem .5rem; font-size: .8rem; }
.kit-btn--primary { background: var(--kit-info); color: #fff; }
.kit-btn--secondary { background: #f6f8fa; border-color: var(--kit-border); color: #1f2328; }
.kit-btn--ghost { background: transparent; color: var(--kit-info); }
.kit-btn--link { background: none; padding: 0; color: var(--kit-info); text-decoration: underline; }
.kit-dialog { border: 1px solid var(--kit-border); border-radius: 8px; padding: 1.25rem; max-width: 32rem; }
.kit-dialog::backdrop { background: rgb(0 0 0 / .35); }
.kit-dialog__title { margin: 0 0 .75rem; font-size: 1.1rem; }
.kit-dialog__actions, .kit-dialog__close { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
.kit-alert { border-left: 4px solid var(--kit-info); padding: .5rem .75rem; margin-bottom: 1rem; }
.kit-alert--ok { border-color: var(--kit-ok); }
.kit-alert--warn { border-color: var(--kit-warn); }
.kit-alert--bad { border-color: var(--kit-bad); }
.kit-alert__title { font-weight: 600; margin: 0; }
.kit-badge { display: inline-block; padding: 0 .5rem; border-radius: 1rem; font-size: .75rem; color: #fff; }
.kit-badge--ok { background: var(--kit-ok); }
.kit-badge--warn { background: var(--kit-warn); }
.kit-badge--bad { background: var(--kit-bad); }
.kit-badge--info { background: var(--kit-info); }
.kit-badge--muted { background: var(--kit-muted); }
.kit-card { border: 1px solid var(--kit-border); border-radius: 6px; padding: 1rem; }
.kit-card__title { margin: 0 0 .5rem; font-size: 1rem; }
.kit-card__footer { margin-top: .75rem; }
.kit-empty { padding: 2rem; text-align: center; color: var(--kit-muted); }
.kit-empty__title { font-weight: 600; margin: 0; }
.kit-filter-bar { display: flex; gap: 1rem; margin-bottom: 1rem; }
.kit-field { display: flex; flex-direction: column; gap: .25rem; }
.kit-field__label { font-size: .75rem; color: var(--kit-muted); }
.kit-select { padding: .25rem .5rem; }
.kit-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem; }
.kit-page-header h1 { margin: 0; font-size: 1.5rem; }
.kit-table { width: 100%; border-collapse: collapse; }
.kit-table th, .kit-table td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid var(--kit-border); }
.kit-table th a { color: inherit; }
.kit-tabs { display: flex; gap: 1rem; border-bottom: 1px solid var(--kit-border); margin-bottom: 1rem; }
.kit-tabs__tab { padding: .4rem 0; color: inherit; text-decoration: none; }
.kit-tabs__tab[aria-current="page"] { border-bottom: 2px solid var(--kit-info); font-weight: 600; }
.kit-toggle-group { display: inline-flex; border: 1px solid var(--kit-border); border-radius: 6px; overflow: hidden; }
.kit-toggle { padding: .25rem .6rem; color: inherit; text-decoration: none; }
.kit-toggle[aria-pressed="true"] { background: #f6f8fa; font-weight: 600; }
CSS

git add vendor public
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Start from the Keel admin template"

# --- The dashboard ---------------------------------------------------------

mkdir -p src/pages data test/pages

cat > package.json <<'JSON'
{
  "name": "harbor",
  "version": "0.9.0",
  "description": "Ops dashboard for the services we run",
  "private": true,
  "type": "module",
  "imports": {
    "#kit/*": "./vendor/kit/*/src/index.js"
  },
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

## Pages

Overview, Services, Incidents, On-call and Runbooks, one module each in
`src/pages/`. `src/server.js` routes requests and wraps each page in
`src/layout.js`; `public/app.css` holds the dashboard's styles.
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

cat > src/html.js <<'JS'
// Escapes text for HTML element content and quoted attribute values.
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
JS

cat > src/layout.js <<'JS'
import { escapeHtml } from './html.js';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/oncall', label: 'On-call' },
  { href: '/runbooks', label: 'Runbooks' },
];

export function layout({ title, active, body }) {
  const nav = NAV.map((item) => {
    const current = item.href === active ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${current}>${escapeHtml(item.label)}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} · Harbor</title>
<link rel="stylesheet" href="/public/kit.css">
<link rel="stylesheet" href="/public/app.css">
<script src="/public/kit.js" defer></script>
</head>
<body>
<nav class="topnav">${nav}</nav>
<main>
${body}
</main>
</body>
</html>`;
}
JS

cat > src/pages/overview.js <<'JS'
import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// One panel per environment, counting the services that are not passing
// their health checks.
export function renderOverview(snapshot) {
  const environments = [...new Set(snapshot.services.map((s) => s.environment))].sort();
  const panels = environments.map((env) => {
    const services = snapshot.services.filter((s) => s.environment === env);
    const unhealthy = services.filter((s) => s.health !== 'passing').length;
    const pill =
      unhealthy === 0
        ? '<span class="pill pill-green">all passing</span>'
        : `<span class="pill pill-red">${unhealthy} not passing</span>`;
    const link = button({
      label: 'View services',
      href: `/services?env=${encodeURIComponent(env)}`,
      variant: 'secondary',
      size: 'sm',
    });
    return `<section class="panel">
  <h2>${escapeHtml(env)}</h2>
  <p>${services.length} services</p>
  ${pill}
  <footer>${link}</footer>
</section>`;
  });
  return `<h1>Overview</h1>
<p class="muted">Snapshot ${escapeHtml(snapshot.generatedAt)}</p>
<div class="panels">
${panels.join('\n')}
</div>`;
}
JS

cat > src/pages/services.js <<'JS'
import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Services list. Filter with ?env=production|staging; sort with
// ?sort=name|deployedAt and ?dir=asc|desc (default: name, ascending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name) || a.environment.localeCompare(b.environment),
  deployedAt: (a, b) => a.deployedAt.localeCompare(b.deployedAt),
};

export function renderServices(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'name';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let services = snapshot.services;
  if (env !== 'all') services = services.filter((s) => s.environment === env);
  const factor = dir === 'desc' ? -1 : 1;
  services = [...services].sort((a, b) => factor * SORTS[sort](a, b));

  const options = ['all', ...ENVIRONMENTS]
    .map((e) => {
      const selected = e === env ? ' selected' : '';
      return `<option value="${e}"${selected}>${e === 'all' ? 'All environments' : e}</option>`;
    })
    .join('');

  // Clicking the active column flips its direction; any other column starts
  // ascending. The links carry the filter so sorting keeps it.
  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?env=${env}&amp;sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

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
  ${sortHeader('name', 'Name')}
  <th>Version</th>
  <th>Environment</th>
  <th>Health</th>
  ${sortHeader('deployedAt', 'Deployed')}
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  const legend = dialog({
    id: 'health-legend',
    title: 'Health checks',
    body: `<ul class="legend">
  <li><span class="pill pill-green">passing</span> every check passed in the last minute</li>
  <li><span class="pill pill-amber">degraded</span> some checks failed</li>
  <li><span class="pill pill-red">failing</span> most or all checks failed</li>
</ul>`,
  });
  const legendButton = button({
    label: 'Health legend',
    variant: 'ghost',
    size: 'sm',
    attrs: { 'data-dialog-open': 'health-legend' },
  });

  return `<div class="title-row">
  <h1>Services</h1>
  ${legendButton}
</div>
<form method="get" action="/services" class="filters">
  <label>Environment
    <select name="env" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
  <input type="hidden" name="dir" value="${dir}">
</form>
${list}
${legend}`;
}

function healthClass(health) {
  if (health === 'passing') return 'pill-green';
  if (health === 'degraded') return 'pill-amber';
  return 'pill-red';
}
JS

cat > src/pages/incidents.js <<'JS'
import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// Incidents, newest first. Open ones by default; ?state=resolved shows the
// resolved ones instead.
export function renderIncidents(snapshot, query) {
  const state = query.state === 'resolved' ? 'resolved' : 'open';
  const incidents = snapshot.incidents
    .filter((i) => (state === 'open' ? i.resolvedAt === null : i.resolvedAt !== null))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  const tab = (value, label) => {
    const current = value === state ? ' aria-current="page"' : '';
    return `<a href="/incidents?state=${value}"${current}>${label}</a>`;
  };

  const items = incidents
    .map((i) => {
      const runbook = button({
        label: 'Runbook',
        href: `/runbooks#${encodeURIComponent(i.runbook)}`,
        variant: 'link',
        size: 'sm',
      });
      return `<li class="incident">
  <span class="pill ${severityClass(i.severity)}">${escapeHtml(i.severity)}</span>
  <strong>${escapeHtml(i.title)}</strong>
  <span class="muted">${escapeHtml(i.service)}, opened ${escapeHtml(i.openedAt)}</span>
  ${runbook}
</li>`;
    })
    .join('\n');

  const list =
    incidents.length === 0
      ? `<p class="muted">No ${state} incidents.</p>`
      : `<ul class="incidents">
${items}
</ul>`;

  return `<h1>Incidents</h1>
<nav class="subnav">${tab('open', 'Open')}${tab('resolved', 'Resolved')}</nav>
${list}`;
}

function severityClass(severity) {
  if (severity === 'sev1') return 'pill-red';
  if (severity === 'sev2') return 'pill-amber';
  return 'pill-grey';
}
JS

cat > src/pages/oncall.js <<'JS'
import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Who is on call for each team this week, and how pages escalate.
export function renderOncall(snapshot) {
  const rows = [...snapshot.rotations]
    .sort((a, b) => a.team.localeCompare(b.team))
    .map(
      (r) => `<tr>
  <td>${escapeHtml(r.team)}</td>
  <td>${escapeHtml(r.primary)}</td>
  <td>${escapeHtml(r.secondary)}</td>
  <td>${escapeHtml(r.until)}</td>
</tr>`,
    )
    .join('\n');

  const policy = dialog({
    id: 'escalation',
    title: 'Escalation policy',
    body: `<ol>${snapshot.escalation.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`,
  });
  const policyButton = button({
    label: 'Escalation policy',
    variant: 'secondary',
    size: 'sm',
    attrs: { 'data-dialog-open': 'escalation' },
  });

  return `<div class="title-row">
  <h1>On-call</h1>
  ${policyButton}
</div>
<table class="oncall">
<thead><tr><th>Team</th><th>Primary</th><th>Secondary</th><th>Until</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
${policy}`;
}
JS

cat > src/pages/runbooks.js <<'JS'
import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// The runbook index. Each panel links to the runbook in the wiki and carries
// an anchor the Incidents page links to.
export function renderRunbooks(snapshot) {
  const panels = [...snapshot.runbooks]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((rb) => {
      const open = button({ label: 'Open runbook', href: rb.url, variant: 'secondary', size: 'sm' });
      return `<section class="panel" id="${escapeHtml(rb.id)}">
  <h2>${escapeHtml(rb.title)}</h2>
  <p>${escapeHtml(rb.summary)}</p>
  <footer>${open}</footer>
</section>`;
    })
    .join('\n');
  return `<h1>Runbooks</h1>
<div class="panels">
${panels}
</div>`;
}
JS

cat > src/server.js <<'JS'
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSnapshot } from './data.js';
import { escapeHtml } from './html.js';
import { layout } from './layout.js';
import { renderIncidents } from './pages/incidents.js';
import { renderOncall } from './pages/oncall.js';
import { renderOverview } from './pages/overview.js';
import { renderRunbooks } from './pages/runbooks.js';
import { renderServices } from './pages/services.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.css': 'text/css', '.js': 'text/javascript' };

const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
  '/oncall': { title: 'On-call', snapshot: 'oncall', render: renderOncall },
  '/runbooks': { title: 'Runbooks', snapshot: 'runbooks', render: renderRunbooks },
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
    const body = `<h1>${escapeHtml(route.title)}</h1>
<p class="muted">Snapshot unavailable, try again in a minute.</p>`;
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
/* Harbor dashboard styles */
body { margin: 0; font: 14px/1.5 system-ui, sans-serif; color: #1f2328; }
.topnav { display: flex; gap: 1rem; padding: .75rem 1.5rem; background: #24292f; }
.topnav a { color: #f6f8fa; text-decoration: none; }
.topnav a[aria-current="page"] { font-weight: 600; text-decoration: underline; }
main { padding: 1.5rem; }
h1 { margin: 0 0 1rem; font-size: 1.5rem; }
.title-row { display: flex; justify-content: space-between; align-items: center; }
.muted { color: #6e7781; }
.panels { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 1rem; }
.panel { border: 1px solid #d0d7de; border-radius: 6px; padding: 1rem; }
.panel h2 { margin: 0 0 .5rem; font-size: 1rem; text-transform: capitalize; }
.panel footer { margin-top: .75rem; }
.filters { margin-bottom: 1rem; }
.filters select { margin-left: .5rem; }
.services, .oncall { width: 100%; border-collapse: collapse; }
.services th, .services td, .oncall th, .oncall td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #ddd; }
.services th a { color: inherit; }
.pill { display: inline-block; padding: 0 .5rem; border-radius: 1rem; font-size: .75rem; color: #fff; }
.pill-green { background: #2da44e; }
.pill-amber { background: #bf8700; }
.pill-red { background: #cf222e; }
.pill-grey { background: #6e7781; }
.subnav { display: flex; gap: 1rem; margin-bottom: 1rem; }
.subnav a[aria-current="page"] { font-weight: 600; }
.incidents { list-style: none; padding: 0; }
.incident { display: flex; gap: .75rem; align-items: center; padding: .5rem 0; border-bottom: 1px solid #ddd; }
.legend { padding-left: 1rem; }
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

cat > data/incidents.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "incidents": [
    { "id": "inc-311", "title": "Notification emails delayed", "service": "notifications", "severity": "sev2", "openedAt": "2026-10-01T08:40:00Z", "resolvedAt": null, "runbook": "queue-backlog" },
    { "id": "inc-310", "title": "Invoices slow to render", "service": "billing", "severity": "sev3", "openedAt": "2026-09-29T12:05:00Z", "resolvedAt": null, "runbook": "slow-queries" },
    { "id": "inc-309", "title": "Search returning stale results", "service": "search", "severity": "sev2", "openedAt": "2026-09-30T10:35:00Z", "resolvedAt": "2026-09-30T11:20:00Z", "runbook": "reindex" },
    { "id": "inc-308", "title": "Gateway 502s in eu-west", "service": "api-gateway", "severity": "sev1", "openedAt": "2026-09-27T21:10:00Z", "resolvedAt": "2026-09-27T21:48:00Z", "runbook": "gateway-errors" }
  ]
}
JSON

cat > data/oncall.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "rotations": [
    { "team": "platform", "primary": "dana", "secondary": "marco", "until": "2026-10-05T09:00:00Z" },
    { "team": "payments", "primary": "sam", "secondary": "priya", "until": "2026-10-05T09:00:00Z" },
    { "team": "messaging", "primary": "marco", "secondary": "dana", "until": "2026-10-03T09:00:00Z" }
  ],
  "escalation": [
    "Page the team's primary.",
    "After 10 minutes without an acknowledgement, page the secondary.",
    "After 20 minutes, page the engineering manager on duty."
  ]
}
JSON

cat > data/runbooks.json <<'JSON'
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "runbooks": [
    { "id": "gateway-errors", "title": "Gateway errors", "summary": "5xx spikes at the edge: check upstream health, then shed load.", "url": "https://wiki.example.com/runbooks/gateway-errors" },
    { "id": "queue-backlog", "title": "Queue backlog", "summary": "Consumers falling behind: scale the workers, then find the slow handler.", "url": "https://wiki.example.com/runbooks/queue-backlog" },
    { "id": "reindex", "title": "Search reindex", "summary": "Stale or missing results: rebuild the index from the primary store.", "url": "https://wiki.example.com/runbooks/reindex" },
    { "id": "slow-queries", "title": "Slow queries", "summary": "Latency from the database: find the query, then add the index or the cache.", "url": "https://wiki.example.com/runbooks/slow-queries" }
  ]
}
JSON

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
  assert.match(html, /<span class="pill pill-red">1 not passing<\/span>/);
  assert.match(html, /<span class="pill pill-green">all passing<\/span>/);
  assert.match(html, /href="\/services\?env=staging">View services</);
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
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=name&amp;dir=desc">Name ▲<\/a><\/th>/);
});

test('sorts by deploy time both ways and keeps the sort in the filter form', () => {
  const newest = renderServices(snapshot, { sort: 'deployedAt', dir: 'desc' });
  assert.ok(newest.indexOf('<td>api</td>') < newest.indexOf('<td>billing</td>'));
  assert.match(newest, /<th aria-sort="descending"><a href="\?env=all&amp;sort=deployedAt&amp;dir=asc">Deployed ▼<\/a><\/th>/);
  assert.match(newest, /<input type="hidden" name="sort" value="deployedAt">/);
  assert.match(newest, /<input type="hidden" name="dir" value="desc">/);
  const oldest = renderServices(snapshot, { sort: 'deployedAt' });
  assert.ok(oldest.indexOf('<td>billing</td>') < oldest.indexOf('<td>api</td>'));
});

test('colors health', () => {
  assert.match(renderServices(snapshot, {}), /<span class="pill pill-red">failing<\/span>/);
});

test('filters by environment, keeps it when sorting, and says when none match', () => {
  const production = renderServices(snapshot, { env: 'production' });
  assert.match(production, /href="\?env=production&amp;sort=deployedAt&amp;dir=asc"/);
  const staging = renderServices(snapshot, { env: 'staging' });
  assert.match(staging, /<option value="staging" selected>/);
  assert.match(staging, /No services in this environment\./);
  assert.doesNotMatch(staging, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderServices(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="name">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('explains the health states in a dialog', () => {
  const html = renderServices(snapshot, {});
  assert.match(html, /data-dialog-open="health-legend"/);
  assert.match(html, /<dialog class="kit-dialog" id="health-legend"/);
});
JS

cat > test/pages/incidents.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderIncidents } from '../../src/pages/incidents.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  incidents: [
    { id: 'inc-2', title: 'Emails delayed', service: 'notifications', severity: 'sev2', openedAt: '2026-10-01T08:40:00Z', resolvedAt: null, runbook: 'queue-backlog' },
    { id: 'inc-1', title: 'Gateway 502s', service: 'api-gateway', severity: 'sev1', openedAt: '2026-09-27T21:10:00Z', resolvedAt: '2026-09-27T21:48:00Z', runbook: 'gateway-errors' },
  ],
};

test('shows open incidents by default, each with its runbook', () => {
  const html = renderIncidents(snapshot, {});
  assert.match(html, /Emails delayed/);
  assert.doesNotMatch(html, /Gateway 502s/);
  assert.match(html, /<span class="pill pill-amber">sev2<\/span>/);
  assert.match(html, /href="\/runbooks#queue-backlog">Runbook</);
  assert.match(html, /<a href="\/incidents\?state=open" aria-current="page">Open<\/a>/);
});

test('shows resolved incidents on request', () => {
  const html = renderIncidents(snapshot, { state: 'resolved' });
  assert.match(html, /Gateway 502s/);
  assert.match(html, /<span class="pill pill-red">sev1<\/span>/);
});

test('says when there are none', () => {
  assert.match(renderIncidents({ ...snapshot, incidents: [] }, {}), /No open incidents\./);
});
JS

cat > test/pages/oncall.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderOncall } from '../../src/pages/oncall.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  rotations: [
    { team: 'platform', primary: 'dana', secondary: 'marco', until: '2026-10-05T09:00:00Z' },
    { team: 'messaging', primary: 'marco', secondary: 'dana', until: '2026-10-03T09:00:00Z' },
  ],
  escalation: ['Page the primary.', 'Then the secondary.'],
};

test('lists rotations by team', () => {
  const html = renderOncall(snapshot);
  assert.ok(html.indexOf('<td>messaging</td>') < html.indexOf('<td>platform</td>'));
});

test('shows the escalation policy in a dialog', () => {
  const html = renderOncall(snapshot);
  assert.match(html, /data-dialog-open="escalation"/);
  assert.match(html, /<li>Page the primary\.<\/li><li>Then the secondary\.<\/li>/);
});
JS

cat > test/pages/runbooks.test.js <<'JS'
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderRunbooks } from '../../src/pages/runbooks.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  runbooks: [
    { id: 'queue-backlog', title: 'Queue backlog', summary: 'Scale the workers.', url: 'https://wiki.example.com/runbooks/queue-backlog' },
    { id: 'gateway-errors', title: 'Gateway errors', summary: 'Shed load.', url: 'https://wiki.example.com/runbooks/gateway-errors' },
  ],
};

test('lists runbooks by title, each with an anchor and a link', () => {
  const html = renderRunbooks(snapshot);
  assert.ok(html.indexOf('Gateway errors') < html.indexOf('Queue backlog'));
  assert.match(html, /<section class="panel" id="queue-backlog">/);
  assert.match(html, /href="https:\/\/wiki\.example\.com\/runbooks\/queue-backlog">Open runbook</);
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

test('serves every page in the nav', async () => {
  for (const path of ['/', '/services', '/incidents', '/oncall', '/runbooks']) {
    assert.equal((await handle(path)).status, 200, path);
  }
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

test('serves the stylesheets and the script', async () => {
  for (const name of ['kit.css', 'app.css', 'kit.js']) {
    assert.equal((await handle(`/public/${name}`)).status, 200, name);
  }
});
JS

git add package.json README.md .gitignore src public data test
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Add the dashboard pages"

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

Sorting and the environment filter behave as on the Services page
(`src/pages/services.js`).

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
