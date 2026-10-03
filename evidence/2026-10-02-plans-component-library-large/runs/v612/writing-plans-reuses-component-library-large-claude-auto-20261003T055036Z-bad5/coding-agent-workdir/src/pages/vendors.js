import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// Third-party services we depend on, from their status pages.
export function renderVendors(snapshot) {
  const vendors = [...snapshot.vendors]
    .sort((a, b) => a.name.localeCompare(b.name));

  const items = vendors
    .map((v) => {
      const link = button({ label: 'Status page', href: v.statusPage, variant: 'link', size: 'sm' });
      return `<li class="list-item">
  <span class="pill ${statusClass(v.status)}">${escapeHtml(v.status)}</span>
  <strong>${escapeHtml(v.name)}</strong>
  <span class="muted">${escapeHtml(v.category)}, checked ${escapeHtml(v.checkedAt)}</span>
  ${link}
</li>`;
    })
    .join('\n');

  const list =
    vendors.length === 0
      ? '<p class="muted">No vendors.</p>'
      : `<ul class="list">
${items}
</ul>`;

  return `<h1>Vendors</h1>
${list}`;
}

function statusClass(status) {
  if (status === 'operational') return 'pill-green';
  if (status === 'degraded') return 'pill-amber';
  return 'pill-red';
}
