import { escapeHtml } from '../html.js';

// API tokens issued to services and people, by name.

export function renderTokens(snapshot) {
  const tokens = [...snapshot.tokens].sort((a, b) => a.name.localeCompare(b.name));

  const rows = tokens
    .map(
      (t) => `<tr>
  <td>${escapeHtml(t.name)}</td>
  <td>${escapeHtml(t.owner)}</td>
  <td>${escapeHtml(t.scopes)}</td>
  <td>${escapeHtml(t.lastUsed)}</td>
  <td>${escapeHtml(t.expiresAt)}</td>
  <td><span class="pill ${statusClass(t.status)}">${escapeHtml(t.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    tokens.length === 0
      ? '<p class="muted">No tokens.</p>'
      : `<table class="list-table">
<thead><tr>
  <th>Token</th>
  <th>Owner</th>
  <th>Scopes</th>
  <th>Last used</th>
  <th>Expires</th>
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Tokens</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'active') return 'pill-green';
  if (status === 'expiring') return 'pill-amber';
  return 'pill-grey';
}
