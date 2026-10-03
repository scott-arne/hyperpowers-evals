import { escapeHtml } from '../html.js';

// Hosts and their load. Filter with ?region=<region>; sort with
// ?sort=name|load and ?dir=asc|desc (default: name, ascending).
const REGIONS = ['eu-west-1', 'eu-central-1', 'us-east-1', 'us-west-2', 'ap-southeast-1'];
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  load: (a, b) => a.load - b.load,
};

export function renderHosts(snapshot, query) {
  const region = REGIONS.includes(query.region) ? query.region : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'name';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let hosts = snapshot.hosts;
  if (region !== 'all') hosts = hosts.filter((h) => h.region === region);
  const factor = dir === 'desc' ? -1 : 1;
  hosts = [...hosts].sort((a, b) => factor * SORTS[sort](a, b));

  const options = ['all', ...REGIONS]
    .map((value) => {
      const selected = value === region ? ' selected' : '';
      return `<option value="${value}"${selected}>${value === 'all' ? 'All regions' : value}</option>`;
    })
    .join('');

  // Sorting keeps the filter, and the filter form keeps the sort.
  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?region=${region}&amp;sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = hosts
    .map(
      (h) => `<tr>
  <td>${escapeHtml(h.name)}</td>
  <td>${escapeHtml(h.region)}</td>
  <td>${escapeHtml(h.role)}</td>
  <td><span class="pill ${statusClass(h.status)}">${escapeHtml(h.status)}</span></td>
  <td>${escapeHtml(h.load)}</td>
  <td>${escapeHtml(h.upSince)}</td>
</tr>`,
    )
    .join('\n');

  const table =
    hosts.length === 0
      ? '<p class="muted">No hosts in this region.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('name', 'Host')}
  <th>Region</th>
  <th>Role</th>
  <th>Status</th>
  ${sortHeader('load', 'Load')}
  <th>Up since</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Hosts</h1>
<form method="get" action="/hosts" class="filters">
  <label>Region
    <select name="region" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
  <input type="hidden" name="dir" value="${dir}">
</form>
${table}`;
}

function statusClass(status) {
  if (status === 'up') return 'pill-green';
  if (status === 'draining') return 'pill-amber';
  return 'pill-red';
}
