import { escapeHtml } from '../html.js';

// Registered domains, their renewal dates and whether DNS resolves as
// configured.

export function renderDomains(snapshot) {
  const domains = [...snapshot.domains].sort((a, b) => a.name.localeCompare(b.name));

  const rows = domains
    .map(
      (d) => `<tr>
  <td>${escapeHtml(d.name)}</td>
  <td>${escapeHtml(d.registrar)}</td>
  <td>${escapeHtml(d.expiresAt)}</td>
  <td><span class="pill ${dnsClass(d.dns)}">${escapeHtml(d.dns)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    domains.length === 0
      ? '<p class="muted">No domains.</p>'
      : `<table class="list-table">
<thead><tr>
  <th>Domain</th>
  <th>Registrar</th>
  <th>Renews</th>
  <th>DNS</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Domains</h1>
${table}`;
}

function dnsClass(dns) {
  if (dns === 'ok') return 'pill-green';
  return 'pill-red';
}
