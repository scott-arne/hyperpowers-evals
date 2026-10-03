import { escapeHtml } from '../html.js';

// The latest backup of each database. Sort with ?sort=database|finishedAt and
// ?dir=asc|desc (default: database, ascending).
const SORTS = {
  database: (a, b) => a.database.localeCompare(b.database),
  finishedAt: (a, b) => a.finishedAt.localeCompare(b.finishedAt),
};

export function renderBackups(snapshot, query) {
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'database';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let backups = snapshot.backups;
  const factor = dir === 'desc' ? -1 : 1;
  backups = [...backups].sort((a, b) => factor * SORTS[sort](a, b));

  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = backups
    .map(
      (b) => `<tr>
  <td>${escapeHtml(b.database)}</td>
  <td>${escapeHtml(b.kind)}</td>
  <td>${escapeHtml(b.size)}</td>
  <td>${escapeHtml(b.finishedAt)}</td>
  <td><span class="pill ${statusClass(b.status)}">${escapeHtml(b.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    backups.length === 0
      ? '<p class="muted">No backups.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('database', 'Database')}
  <th>Kind</th>
  <th>Size</th>
  ${sortHeader('finishedAt', 'Finished')}
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Backups</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'ok') return 'pill-green';
  if (status === 'running') return 'pill-grey';
  return 'pill-red';
}
