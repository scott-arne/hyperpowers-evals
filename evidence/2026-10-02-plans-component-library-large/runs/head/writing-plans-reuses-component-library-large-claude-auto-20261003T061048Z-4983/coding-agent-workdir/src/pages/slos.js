import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Service level objectives and the error budget left this month. Sort with
// ?sort=name|budgetLeft and ?dir=asc|desc (default: name, ascending).
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  budgetLeft: (a, b) => a.budgetLeft - b.budgetLeft,
};

export function renderSlos(snapshot, query) {
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'name';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let slos = snapshot.slos;
  const factor = dir === 'desc' ? -1 : 1;
  slos = [...slos].sort((a, b) => factor * SORTS[sort](a, b));

  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = slos
    .map(
      (s) => `<tr>
  <td>${escapeHtml(s.name)}</td>
  <td>${escapeHtml(s.service)}</td>
  <td>${escapeHtml(s.target)}</td>
  <td>${escapeHtml(s.current)}</td>
  <td>${escapeHtml(s.budgetLeft)}</td>
  <td><span class="pill ${statusClass(s.status)}">${escapeHtml(s.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    slos.length === 0
      ? '<p class="muted">No objectives.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('name', 'Objective')}
  <th>Service</th>
  <th>Target</th>
  <th>Current</th>
  ${sortHeader('budgetLeft', 'Budget left %')}
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  const legend = dialog({
    id: 'slos-legend',
    title: 'Objective states',
    body: `<ul class="legend">
  <li><span class="pill pill-green">met</span> more than a quarter of the budget left</li>
  <li><span class="pill pill-amber">at-risk</span> less than a quarter left</li>
  <li><span class="pill pill-red">breached</span> the budget is spent</li>
</ul>`,
  });
  const legendButton = button({
    label: 'Legend',
    variant: 'ghost',
    size: 'sm',
    attrs: { 'data-dialog-open': 'slos-legend' },
  });

  return `<div class="title-row">
  <h1>SLOs</h1>
  ${legendButton}
</div>
${table}
${legend}`;
}

function statusClass(status) {
  if (status === 'met') return 'pill-green';
  if (status === 'at-risk') return 'pill-amber';
  return 'pill-red';
}
