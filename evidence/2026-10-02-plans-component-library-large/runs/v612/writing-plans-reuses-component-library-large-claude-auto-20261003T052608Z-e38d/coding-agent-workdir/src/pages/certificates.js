import { escapeHtml } from '../html.js';

// TLS certificates and when they expire. Sort with ?sort=domain|expiresAt
// and ?dir=asc|desc (default: domain, ascending).
const SORTS = {
  domain: (a, b) => a.domain.localeCompare(b.domain),
  expiresAt: (a, b) => a.expiresAt.localeCompare(b.expiresAt),
};

export function renderCertificates(snapshot, query) {
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'domain';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let certificates = snapshot.certificates;
  const factor = dir === 'desc' ? -1 : 1;
  certificates = [...certificates].sort((a, b) => factor * SORTS[sort](a, b));

  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = certificates
    .map(
      (c) => `<tr>
  <td>${escapeHtml(c.domain)}</td>
  <td>${escapeHtml(c.issuer)}</td>
  <td>${escapeHtml(c.expiresAt)}</td>
  <td><span class="pill ${statusClass(c.status)}">${escapeHtml(c.status)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    certificates.length === 0
      ? '<p class="muted">No certificates.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('domain', 'Domain')}
  <th>Issuer</th>
  ${sortHeader('expiresAt', 'Expires')}
  <th>Status</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Certificates</h1>
${table}`;
}

function statusClass(status) {
  if (status === 'valid') return 'pill-green';
  if (status === 'expiring') return 'pill-amber';
  return 'pill-red';
}
