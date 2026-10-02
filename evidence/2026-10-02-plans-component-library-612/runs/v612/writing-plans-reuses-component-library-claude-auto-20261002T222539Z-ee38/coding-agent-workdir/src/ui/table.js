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
