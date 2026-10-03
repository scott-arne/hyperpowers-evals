import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// Incidents, newest first. Open ones by default; ?state=resolved shows the
// resolved ones instead.
export function renderIncidents(snapshot, query) {
  const state = query.state === 'resolved' ? 'resolved' : 'open';
  const incidents = snapshot.incidents
    .filter((i) => (state === 'open' ? i.resolvedAt === null : i.resolvedAt !== null))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  const tab = (value, label) => {
    const current = value === state ? ' aria-current="page"' : '';
    return `<a href="/incidents?state=${value}"${current}>${label}</a>`;
  };

  const items = incidents
    .map((i) => {
      const runbook = button({
        label: 'Runbook',
        href: `/runbooks#${encodeURIComponent(i.runbook)}`,
        variant: 'link',
        size: 'sm',
      });
      return `<li class="incident">
  <span class="pill ${severityClass(i.severity)}">${escapeHtml(i.severity)}</span>
  <strong>${escapeHtml(i.title)}</strong>
  <span class="muted">${escapeHtml(i.service)}, opened ${escapeHtml(i.openedAt)}</span>
  ${runbook}
</li>`;
    })
    .join('\n');

  const list =
    incidents.length === 0
      ? `<p class="muted">No ${state} incidents.</p>`
      : `<ul class="incidents">
${items}
</ul>`;

  return `<h1>Incidents</h1>
<nav class="subnav">${tab('open', 'Open')}${tab('resolved', 'Resolved')}</nav>
${list}`;
}

function severityClass(severity) {
  if (severity === 'sev1') return 'pill-red';
  if (severity === 'sev2') return 'pill-amber';
  return 'pill-grey';
}
