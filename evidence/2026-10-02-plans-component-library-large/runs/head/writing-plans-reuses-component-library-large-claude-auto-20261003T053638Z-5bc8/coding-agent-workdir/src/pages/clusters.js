import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// Kubernetes clusters, one panel per region.
export function renderClusters(snapshot) {
  const regions = [...new Set(snapshot.clusters.map((c) => c.region))].sort();
  const panels = regions.map((region) => {
    const clusters = snapshot.clusters.filter((c) => c.region === region);
    const items = clusters
      .map((c) => `<li>${escapeHtml(c.name)} <span class="muted">${escapeHtml(c.version)}</span> <span class="pill ${statusClass(c.status)}">${escapeHtml(c.status)}</span></li>`)
      .join('');
    const link = button({ label: 'View hosts', href: `/hosts?region=${encodeURIComponent(region)}`, variant: 'secondary', size: 'sm' });
    return `<section class="panel">
  <h2>${escapeHtml(region)}</h2>
  <p>${clusters.length} clusters</p>
  <ul class="panel-list">${items}</ul>
  <footer>${link}</footer>
</section>`;
  });
  return `<h1>Clusters</h1>
<div class="panels">
${panels.join('\n')}
</div>`;
}

function statusClass(status) {
  if (status === 'healthy') return 'pill-green';
  if (status === 'upgrading') return 'pill-amber';
  return 'pill-red';
}
