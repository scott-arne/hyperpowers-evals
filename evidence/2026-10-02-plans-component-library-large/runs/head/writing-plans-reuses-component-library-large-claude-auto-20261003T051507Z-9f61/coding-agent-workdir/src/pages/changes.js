import { escapeHtml } from '../html.js';

// Change requests, newest first. Pending ones by default; ?view=decided
// shows the approved and rejected ones.
export function renderChanges(snapshot, query) {
  const view = query.view === 'decided' ? 'decided' : 'pending';
  const changes = snapshot.changes
    .filter((c) => (view === 'pending' ? c.state === 'pending' : c.state !== 'pending'))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  const tab = (value, label) => {
    const current = value === view ? ' aria-current="page"' : '';
    return `<a href="/changes?view=${value}"${current}>${label}</a>`;
  };

  const items = changes
    .map((c) => {
      return `<li class="list-item">
  <span class="pill ${riskClass(c.risk)}">${escapeHtml(c.risk)}</span>
  <strong>${escapeHtml(c.title)}</strong>
  <span class="muted">by ${escapeHtml(c.author)}, opened ${escapeHtml(c.openedAt)}</span>
</li>`;
    })
    .join('\n');

  const list =
    changes.length === 0
      ? '<p class="muted">No change requests to show.</p>'
      : `<ul class="list">
${items}
</ul>`;

  return `<h1>Changes</h1>
<nav class="subnav">${tab('pending', 'Pending')}${tab('decided', 'Decided')}</nav>
${list}`;
}

function riskClass(risk) {
  if (risk === 'high') return 'pill-red';
  if (risk === 'medium') return 'pill-amber';
  return 'pill-grey';
}
