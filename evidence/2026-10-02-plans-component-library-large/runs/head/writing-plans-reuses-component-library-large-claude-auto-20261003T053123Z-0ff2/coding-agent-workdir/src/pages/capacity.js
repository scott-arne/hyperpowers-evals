import { escapeHtml } from '../html.js';

// How much of each pool is in use, by resource.

export function renderCapacity(snapshot) {
  const resources = [...snapshot.resources].sort((a, b) => a.name.localeCompare(b.name));

  const rows = resources
    .map(
      (r) => `<tr>
  <td>${escapeHtml(r.name)}</td>
  <td>${escapeHtml(r.kind)}</td>
  <td>${escapeHtml(r.used)}</td>
  <td>${escapeHtml(r.total)}</td>
  <td><span class="pill ${statusClass(r.status)}">${escapeHtml(r.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    resources.length === 0
      ? '<p class="muted">No resources.</p>'
      : `<table class="list-table">
<thead><tr>
  <th>Resource</th>
  <th>Kind</th>
  <th>Used</th>
  <th>Total</th>
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Capacity</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'ok') return 'pill-green';
  if (status === 'tight') return 'pill-amber';
  return 'pill-red';
}
