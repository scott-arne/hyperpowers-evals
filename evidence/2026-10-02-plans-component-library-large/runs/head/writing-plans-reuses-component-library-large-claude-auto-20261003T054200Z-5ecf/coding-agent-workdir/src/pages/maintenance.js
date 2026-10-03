import { escapeHtml } from '../html.js';

// Planned maintenance windows. Upcoming ones by default; ?when=done shows the
// finished ones.
export function renderMaintenance(snapshot, query) {
  const when = query.when === 'done' ? 'done' : 'upcoming';
  const windows = snapshot.windows
    .filter((w) => w.state === when)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const tab = (value, label) => {
    const current = value === when ? ' aria-current="page"' : '';
    return `<a href="/maintenance?when=${value}"${current}>${label}</a>`;
  };

  const items = windows
    .map((w) => {
      return `<li class="list-item">
  <span class="pill ${stateClass(w.state)}">${escapeHtml(w.state)}</span>
  <strong>${escapeHtml(w.title)}</strong>
  <span class="muted">${escapeHtml(w.service)}, starts ${escapeHtml(w.startsAt)}, ends ${escapeHtml(w.endsAt)}</span>
</li>`;
    })
    .join('\n');

  const list =
    windows.length === 0
      ? '<p class="muted">No maintenance windows to show.</p>'
      : `<ul class="list">
${items}
</ul>`;

  return `<h1>Maintenance</h1>
<nav class="subnav">${tab('upcoming', 'Upcoming')}${tab('done', 'Done')}</nav>
${list}`;
}

function stateClass(state) {
  if (state === 'upcoming') return 'pill-amber';
  return 'pill-grey';
}
