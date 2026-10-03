import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Services list. Filter with ?env=production|staging; sort with
// ?sort=name|deployedAt and ?dir=asc|desc (default: name, ascending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name) || a.environment.localeCompare(b.environment),
  deployedAt: (a, b) => a.deployedAt.localeCompare(b.deployedAt),
};

export function renderServices(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'name';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';

  let services = snapshot.services;
  if (env !== 'all') services = services.filter((s) => s.environment === env);
  const factor = dir === 'desc' ? -1 : 1;
  services = [...services].sort((a, b) => factor * SORTS[sort](a, b));

  const options = ['all', ...ENVIRONMENTS]
    .map((e) => {
      const selected = e === env ? ' selected' : '';
      return `<option value="${e}"${selected}>${e === 'all' ? 'All environments' : e}</option>`;
    })
    .join('');

  // Clicking the active column flips its direction; any other column starts
  // ascending. The links carry the filter so sorting keeps it.
  const sortHeader = (key, label) => {
    const active = key === sort;
    const next = active && dir === 'asc' ? 'desc' : 'asc';
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    return `<th${ariaSort}><a href="?env=${env}&amp;sort=${key}&amp;dir=${next}">${label}${arrow}</a></th>`;
  };

  const rows = services
    .map(
      (s) => `<tr>
  <td>${escapeHtml(s.name)}</td>
  <td>${escapeHtml(s.version)}</td>
  <td>${escapeHtml(s.environment)}</td>
  <td><span class="pill ${healthClass(s.health)}">${escapeHtml(s.health)}</span></td>
  <td>${escapeHtml(s.deployedAt)}</td>
</tr>`,
    )
    .join('\n');

  const list =
    services.length === 0
      ? '<p class="muted">No services in this environment.</p>'
      : `<table class="services">
<thead><tr>
  ${sortHeader('name', 'Name')}
  <th>Version</th>
  <th>Environment</th>
  <th>Health</th>
  ${sortHeader('deployedAt', 'Deployed')}
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  const legend = dialog({
    id: 'health-legend',
    title: 'Health checks',
    body: `<ul class="legend">
  <li><span class="pill pill-green">passing</span> every check passed in the last minute</li>
  <li><span class="pill pill-amber">degraded</span> some checks failed</li>
  <li><span class="pill pill-red">failing</span> most or all checks failed</li>
</ul>`,
  });
  const legendButton = button({
    label: 'Health legend',
    variant: 'ghost',
    size: 'sm',
    attrs: { 'data-dialog-open': 'health-legend' },
  });

  return `<div class="title-row">
  <h1>Services</h1>
  ${legendButton}
</div>
<form method="get" action="/services" class="filters">
  <label>Environment
    <select name="env" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
  <input type="hidden" name="dir" value="${dir}">
</form>
${list}
${legend}`;
}

function healthClass(health) {
  if (health === 'passing') return 'pill-green';
  if (health === 'degraded') return 'pill-amber';
  return 'pill-red';
}
