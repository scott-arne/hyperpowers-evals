import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Firing and recent alerts. Filter with ?severity=critical|warning|info; sort
// with ?sort=name|firedAt and ?dir=asc|desc (default: name, ascending).
const SEVERITIES = ['critical', 'warning', 'info'];
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  firedAt: (a, b) => a.firedAt.localeCompare(b.firedAt),
};

export function renderAlerts(snapshot, query) {
  const severity = SEVERITIES.includes(query.severity) ? query.severity : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'name';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let alerts = snapshot.alerts;
  if (severity !== 'all') alerts = alerts.filter((a) => a.severity === severity);
  const factor = dir === 'desc' ? -1 : 1;
  alerts = [...alerts].sort((a, b) => factor * SORTS[sort](a, b));

  const options = ['all', ...SEVERITIES]
    .map((value) => {
      const selected = value === severity ? ' selected' : '';
      return `<option value="${value}"${selected}>${value === 'all' ? 'All severities' : value}</option>`;
    })
    .join('');

  // Sorting keeps the filter, and the filter form keeps the sort.
  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?severity=${severity}&amp;sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = alerts
    .map(
      (a) => `<tr>
  <td>${escapeHtml(a.name)}</td>
  <td>${escapeHtml(a.service)}</td>
  <td><span class="pill ${severityClass(a.severity)}">${escapeHtml(a.severity)}</span></td>
  <td>${escapeHtml(a.state)}</td>
  <td>${escapeHtml(a.firedAt)}</td>
</tr>`,
    )
    .join('\n');

  const table =
    alerts.length === 0
      ? '<p class="muted">No alerts at this severity.</p>'
      : `<table class="list-table">
<thead><tr>
  ${sortHeader('name', 'Alert')}
  <th>Service</th>
  <th>Severity</th>
  <th>State</th>
  ${sortHeader('firedAt', 'Fired')}
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  const legend = dialog({
    id: 'alerts-legend',
    title: 'Severities',
    body: `<ul class="legend">
  <li><span class="pill pill-red">critical</span> pages whoever is on call</li>
  <li><span class="pill pill-amber">warning</span> opens a ticket for the owning team</li>
  <li><span class="pill pill-grey">info</span> shown here only</li>
</ul>`,
  });
  const legendButton = button({
    label: 'Legend',
    variant: 'ghost',
    size: 'sm',
    attrs: { 'data-dialog-open': 'alerts-legend' },
  });

  return `<div class="title-row">
  <h1>Alerts</h1>
  ${legendButton}
</div>
<form method="get" action="/alerts" class="filters">
  <label>Severity
    <select name="severity" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
  <input type="hidden" name="dir" value="${dir}">
</form>
${table}
${legend}`;
}

function severityClass(severity) {
  if (severity === 'critical') return 'pill-red';
  if (severity === 'warning') return 'pill-amber';
  return 'pill-grey';
}
