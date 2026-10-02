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
