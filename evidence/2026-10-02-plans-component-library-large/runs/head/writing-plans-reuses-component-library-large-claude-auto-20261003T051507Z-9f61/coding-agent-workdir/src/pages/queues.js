import { escapeHtml } from '../html.js';

// Work queues and how far behind their consumers are. Sort with
// ?sort=name|depth and ?dir=asc|desc (default: name, ascending).
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  depth: (a, b) => a.depth - b.depth,
};

export function renderQueues(snapshot, query) {
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'name';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let queues = snapshot.queues;
  const factor = dir === 'desc' ? -1 : 1;
  queues = [...queues].sort((a, b) => factor * SORTS[sort](a, b));

  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = queues
    .map(
      (q) => `<tr>
  <td>${escapeHtml(q.name)}</td>
  <td>${escapeHtml(q.depth)}</td>
  <td>${escapeHtml(q.consumers)}</td>
  <td>${escapeHtml(q.oldest)}</td>
  <td><span class="pill ${statusClass(q.status)}">${escapeHtml(q.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    queues.length === 0
      ? '<p class="muted">No queues.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('name', 'Queue')}
  ${sortHeader('depth', 'Depth')}
  <th>Consumers</th>
  <th>Oldest message</th>
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Queues</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'ok') return 'pill-green';
  if (status === 'backlog') return 'pill-amber';
  return 'pill-red';
}
