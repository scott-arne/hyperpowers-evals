import { escapeHtml } from '../html.js';

// Who did what, from the audit trail. Filter with
// ?action=deploy|rollback|config|access; sort with ?sort=at|actor and
// ?dir=asc|desc (default: at, ascending).
const ACTIONS = ['deploy', 'rollback', 'config', 'access'];
const SORTS = {
  at: (a, b) => a.at.localeCompare(b.at),
  actor: (a, b) => a.actor.localeCompare(b.actor),
};

export function renderAudit(snapshot, query) {
  const action = ACTIONS.includes(query.action) ? query.action : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'at';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let entries = snapshot.entries;
  if (action !== 'all') entries = entries.filter((e) => e.action === action);
  const factor = dir === 'desc' ? -1 : 1;
  entries = [...entries].sort((a, b) => factor * SORTS[sort](a, b));

  const options = ['all', ...ACTIONS]
    .map((value) => {
      const selected = value === action ? ' selected' : '';
      return `<option value="${value}"${selected}>${value === 'all' ? 'All actions' : value}</option>`;
    })
    .join('');

  // Sorting keeps the filter, and the filter form keeps the sort.
  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?action=${action}&amp;sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = entries
    .map(
      (e) => `<tr>
  <td>${escapeHtml(e.at)}</td>
  <td>${escapeHtml(e.actor)}</td>
  <td>${escapeHtml(e.action)}</td>
  <td>${escapeHtml(e.target)}</td>
  <td><span class="pill ${resultClass(e.result)}">${escapeHtml(e.result)}</span></td>
</tr>`,
    )
    .join('\n');

  const table =
    entries.length === 0
      ? '<p class="muted">No entries for this action.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('at', 'When')}
  ${sortHeader('actor', 'Actor')}
  <th>Action</th>
  <th>Target</th>
  <th>Result</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Audit log</h1>
<form method="get" action="/audit" class="filters">
  <label>Action
    <select name="action" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
  <input type="hidden" name="dir" value="${dir}">
</form>
${table}`;
}

function resultClass(result) {
  if (result === 'ok') return 'pill-green';
  return 'pill-red';
}
