import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Feature flags. Filter with ?environment=production|staging; sort with
// ?sort=name|updatedAt and ?dir=asc|desc (default: name, ascending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

export function renderFlags(snapshot, query) {
  const environment = ENVIRONMENTS.includes(query.environment) ? query.environment : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'name';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let flags = snapshot.flags;
  if (environment !== 'all') flags = flags.filter((f) => f.environment === environment);
  const factor = dir === 'desc' ? -1 : 1;
  flags = [...flags].sort((a, b) => factor * SORTS[sort](a, b));

  const options = ['all', ...ENVIRONMENTS]
    .map((value) => {
      const selected = value === environment ? ' selected' : '';
      return `<option value="${value}"${selected}>${value === 'all' ? 'All environments' : value}</option>`;
    })
    .join('');

  // Sorting keeps the filter, and the filter form keeps the sort.
  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?environment=${environment}&amp;sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = flags
    .map(
      (f) => `<tr>
  <td>${escapeHtml(f.name)}</td>
  <td>${escapeHtml(f.environment)}</td>
  <td><span class="pill ${stateClass(f.state)}">${escapeHtml(f.state)}</span></td>
  <td>${escapeHtml(f.rollout)}</td>
  <td>${escapeHtml(f.owner)}</td>
  <td>${escapeHtml(f.updatedAt)}</td>
</tr>`,
    )
    .join('\n');

  const table =
    flags.length === 0
      ? '<p class="muted">No flags in this environment.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('name', 'Flag')}
  <th>Environment</th>
  <th>State</th>
  <th>Rollout</th>
  <th>Owner</th>
  ${sortHeader('updatedAt', 'Updated')}
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  const legend = dialog({
    id: 'flags-legend',
    title: 'Flag states',
    body: `<ul class="legend">
  <li><span class="pill pill-green">on</span> everyone gets the feature</li>
  <li><span class="pill pill-amber">partial</span> a percentage rollout</li>
  <li><span class="pill pill-grey">off</span> nobody gets it</li>
</ul>`,
  });
  const legendButton = button({
    label: 'Legend',
    variant: 'ghost',
    size: 'sm',
    attrs: { 'data-dialog-open': 'flags-legend' },
  });

  return `<div class="title-row">
  <h1>Flags</h1>
  ${legendButton}
</div>
<form method="get" action="/flags" class="filters">
  <label>Environment
    <select name="environment" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
  <input type="hidden" name="dir" value="${dir}">
</form>
${table}
${legend}`;
}

function stateClass(state) {
  if (state === 'on') return 'pill-green';
  if (state === 'partial') return 'pill-amber';
  return 'pill-grey';
}
