import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// One panel per environment, counting the services that are not passing
// their health checks.
export function renderOverview(snapshot) {
  const environments = [...new Set(snapshot.services.map((s) => s.environment))].sort();
  const panels = environments.map((env) => {
    const services = snapshot.services.filter((s) => s.environment === env);
    const unhealthy = services.filter((s) => s.health !== 'passing').length;
    const pill =
      unhealthy === 0
        ? '<span class="pill pill-green">all passing</span>'
        : `<span class="pill pill-red">${unhealthy} not passing</span>`;
    const link = button({
      label: 'View services',
      href: `/services?env=${encodeURIComponent(env)}`,
      variant: 'secondary',
      size: 'sm',
    });
    return `<section class="panel">
  <h2>${escapeHtml(env)}</h2>
  <p>${services.length} services</p>
  ${pill}
  <footer>${link}</footer>
</section>`;
  });
  return `<h1>Overview</h1>
<p class="muted">Snapshot ${escapeHtml(snapshot.generatedAt)}</p>
<div class="panels">
${panels.join('\n')}
</div>`;
}
