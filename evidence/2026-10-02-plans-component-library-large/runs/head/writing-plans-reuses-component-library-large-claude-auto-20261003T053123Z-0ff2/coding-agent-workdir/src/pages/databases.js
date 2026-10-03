import { escapeHtml } from '../html.js';

// Database instances, by name.

export function renderDatabases(snapshot) {
  const databases = [...snapshot.databases].sort((a, b) => a.name.localeCompare(b.name));

  const rows = databases
    .map(
      (d) => `<tr>
  <td>${escapeHtml(d.name)}</td>
  <td>${escapeHtml(d.engine)}</td>
  <td>${escapeHtml(d.version)}</td>
  <td>${escapeHtml(d.size)}</td>
  <td>${escapeHtml(d.replicas)}</td>
  <td><span class="pill ${statusClass(d.status)}">${escapeHtml(d.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    databases.length === 0
      ? '<p class="muted">No databases.</p>'
      : `<table class="list-table">
<thead><tr>
  <th>Database</th>
  <th>Engine</th>
  <th>Version</th>
  <th>Size</th>
  <th>Replicas</th>
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Databases</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'online') return 'pill-green';
  if (status === 'maintenance') return 'pill-amber';
  return 'pill-red';
}
