import { escapeHtml } from '../html.js';

// Public API endpoints with their latency and error rate over the last hour.
// Sort with ?sort=path|p95 and ?dir=asc|desc (default: path, ascending).
const SORTS = {
  path: (a, b) => a.path.localeCompare(b.path),
  p95: (a, b) => a.p95 - b.p95,
};

export function renderEndpoints(snapshot, query) {
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'path';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let endpoints = snapshot.endpoints;
  const factor = dir === 'desc' ? -1 : 1;
  endpoints = [...endpoints].sort((a, b) => factor * SORTS[sort](a, b));

  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = endpoints
    .map(
      (e) => `<tr>
  <td>${escapeHtml(e.path)}</td>
  <td>${escapeHtml(e.method)}</td>
  <td>${escapeHtml(e.service)}</td>
  <td>${escapeHtml(e.p95)}</td>
  <td>${escapeHtml(e.errorRate)}</td>
  <td><span class="pill ${statusClass(e.status)}">${escapeHtml(e.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    endpoints.length === 0
      ? '<p class="muted">No endpoints.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('path', 'Path')}
  <th>Method</th>
  <th>Service</th>
  ${sortHeader('p95', 'p95 ms')}
  <th>Errors</th>
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Endpoints</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'ok') return 'pill-green';
  if (status === 'slow') return 'pill-amber';
  return 'pill-red';
}
