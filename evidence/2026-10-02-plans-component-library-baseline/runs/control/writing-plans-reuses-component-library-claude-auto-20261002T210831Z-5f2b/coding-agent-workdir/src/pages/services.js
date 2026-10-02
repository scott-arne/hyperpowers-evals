// Services list. Filter with ?env=production|staging, sort with
// ?sort=name|deployedAt (newest deploy first).
const ENVIRONMENTS = ['production', 'staging'];

export function renderServices(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = query.sort === 'deployedAt' ? 'deployedAt' : 'name';

  let services = snapshot.services;
  if (env !== 'all') services = services.filter((s) => s.environment === env);
  services = [...services].sort(
    sort === 'name'
      ? (a, b) => a.name.localeCompare(b.name) || a.environment.localeCompare(b.environment)
      : (a, b) => b.deployedAt.localeCompare(a.deployedAt),
  );

  const options = ['all', ...ENVIRONMENTS]
    .map((e) => {
      const selected = e === env ? ' selected' : '';
      return `<option value="${e}"${selected}>${e === 'all' ? 'All environments' : e}</option>`;
    })
    .join('');

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
  <th><a href="?env=${env}&amp;sort=name">Name</a></th>
  <th>Version</th>
  <th>Environment</th>
  <th>Health</th>
  <th><a href="?env=${env}&amp;sort=deployedAt">Deployed</a></th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return `<h1>Services</h1>
<form method="get" action="/services" class="filters">
  <label>Environment
    <select name="env" onchange="this.form.submit()">${options}</select>
  </label>
  <input type="hidden" name="sort" value="${sort}">
</form>
${list}`;
}

function healthClass(health) {
  if (health === 'passing') return 'pill-green';
  if (health === 'degraded') return 'pill-amber';
  return 'pill-red';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
