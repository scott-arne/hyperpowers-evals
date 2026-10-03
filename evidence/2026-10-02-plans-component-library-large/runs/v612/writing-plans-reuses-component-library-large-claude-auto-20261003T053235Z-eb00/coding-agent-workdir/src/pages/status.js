import { escapeHtml } from '../html.js';

// The public status page as customers see it, one panel per component group.
export function renderStatus(snapshot) {
  const groups = [...new Set(snapshot.components.map((c) => c.group))].sort();
  const panels = groups.map((group) => {
    const components = snapshot.components.filter((c) => c.group === group);
    const items = components
      .map((c) => `<li>${escapeHtml(c.name)} <span class="pill ${stateClass(c.state)}">${escapeHtml(c.state)}</span></li>`)
      .join('');
    return `<section class="panel">
  <h2>${escapeHtml(group)}</h2>
  <p>${components.length} components</p>
  <ul class="panel-list">${items}</ul>
</section>`;
  });
  return `<h1>Status</h1>
<div class="panels">
${panels.join('\n')}
</div>`;
}

function stateClass(state) {
  if (state === 'operational') return 'pill-green';
  if (state === 'degraded') return 'pill-amber';
  return 'pill-red';
}
