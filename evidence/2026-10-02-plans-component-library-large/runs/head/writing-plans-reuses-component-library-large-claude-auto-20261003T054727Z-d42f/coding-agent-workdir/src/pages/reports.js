import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// Weekly and monthly operations reports, newest first.
export function renderReports(snapshot) {
  const reports = [...snapshot.reports]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const items = reports
    .map((r) => {
      const link = button({ label: 'Open', href: r.url, variant: 'link', size: 'sm' });
      return `<li class="list-item">
  <span class="pill ${stateClass(r.state)}">${escapeHtml(r.state)}</span>
  <strong>${escapeHtml(r.title)}</strong>
  <span class="muted">${escapeHtml(r.period)}, by ${escapeHtml(r.owner)}, published ${escapeHtml(r.publishedAt)}</span>
  ${link}
</li>`;
    })
    .join('\n');

  const list =
    reports.length === 0
      ? '<p class="muted">No reports yet.</p>'
      : `<ul class="list">
${items}
</ul>`;

  return `<h1>Reports</h1>
${list}`;
}

function stateClass(state) {
  if (state === 'published') return 'pill-green';
  return 'pill-grey';
}
