import { escapeHtml } from '../html.js';

// Secrets and when they were last rotated, by name. Values never reach the
// snapshot.

export function renderSecrets(snapshot) {
  const secrets = [...snapshot.secrets].sort((a, b) => a.name.localeCompare(b.name));

  const rows = secrets
    .map(
      (s) => `<tr>
  <td>${escapeHtml(s.name)}</td>
  <td>${escapeHtml(s.store)}</td>
  <td>${escapeHtml(s.rotatedAt)}</td>
  <td>${escapeHtml(s.rotateBy)}</td>
  <td><span class="pill ${statusClass(s.status)}">${escapeHtml(s.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    secrets.length === 0
      ? '<p class="muted">No secrets.</p>'
      : `<table class="list-table">
<thead><tr>
  <th>Secret</th>
  <th>Store</th>
  <th>Rotated</th>
  <th>Rotate by</th>
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Secrets</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'ok') return 'pill-green';
  if (status === 'due') return 'pill-amber';
  return 'pill-red';
}
