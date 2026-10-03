import { escapeHtml } from '../html.js';

// Outgoing webhook subscriptions and their last delivery, by name.

export function renderWebhooks(snapshot) {
  const webhooks = [...snapshot.webhooks].sort((a, b) => a.name.localeCompare(b.name));

  const rows = webhooks
    .map(
      (w) => `<tr>
  <td>${escapeHtml(w.name)}</td>
  <td>${escapeHtml(w.url)}</td>
  <td>${escapeHtml(w.events)}</td>
  <td>${escapeHtml(w.lastDelivery)}</td>
  <td><span class="pill ${statusClass(w.status)}">${escapeHtml(w.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    webhooks.length === 0
      ? '<p class="muted">No webhooks.</p>'
      : `<table class="list-table">
<thead><tr>
  <th>Webhook</th>
  <th>URL</th>
  <th>Events</th>
  <th>Last delivery</th>
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Webhooks</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'healthy') return 'pill-green';
  if (status === 'paused') return 'pill-grey';
  return 'pill-red';
}
