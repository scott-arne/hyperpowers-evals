import { escapeHtml } from '../html.js';

// Cloud regions we run in, grouped by provider.
export function renderRegions(snapshot) {
  const providers = [...new Set(snapshot.regions.map((r) => r.provider))].sort();
  const panels = providers.map((provider) => {
    const regions = snapshot.regions.filter((r) => r.provider === provider);
    const items = regions
      .map((r) => `<li>${escapeHtml(r.name)} <span class="muted">${escapeHtml(r.services)}</span> <span class="pill ${statusClass(r.status)}">${escapeHtml(r.status)}</span></li>`)
      .join('');
    return `<section class="panel">
  <h2>${escapeHtml(provider)}</h2>
  <p>${regions.length} regions</p>
  <ul class="panel-list">${items}</ul>
</section>`;
  });
  return `<h1>Regions</h1>
<div class="panels">
${panels.join('\n')}
</div>`;
}

function statusClass(status) {
  if (status === 'operational') return 'pill-green';
  if (status === 'degraded') return 'pill-amber';
  return 'pill-red';
}
