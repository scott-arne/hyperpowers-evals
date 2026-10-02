import { card, pageHeader, statusChip } from '../ui/index.js';

// One card per environment, counting the services that are not passing their
// health checks.
export function renderOverview(snapshot) {
  const environments = [...new Set(snapshot.services.map((s) => s.environment))].sort();
  const cards = environments.map((env) => {
    const services = snapshot.services.filter((s) => s.environment === env);
    const unhealthy = services.filter((s) => s.health !== 'passing').length;
    const chip =
      unhealthy === 0
        ? statusChip('all passing', 'ok')
        : statusChip(`${unhealthy} not passing`, 'bad');
    return card({
      title: env,
      body: `<p>${services.length} services</p>${chip}`,
      footer: `<a href="/services?env=${encodeURIComponent(env)}">View services</a>`,
    });
  });
  return `${pageHeader({ title: 'Overview', subtitle: `Snapshot ${snapshot.generatedAt}` })}
<div class="ui-grid">
${cards.join('\n')}
</div>`;
}
