import { button } from '#kit/button';
import { escapeHtml } from '../html.js';

// The runbook index. Each panel links to the runbook in the wiki and carries
// an anchor the Incidents page links to.
export function renderRunbooks(snapshot) {
  const panels = [...snapshot.runbooks]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((rb) => {
      const open = button({ label: 'Open runbook', href: rb.url, variant: 'secondary', size: 'sm' });
      return `<section class="panel" id="${escapeHtml(rb.id)}">
  <h2>${escapeHtml(rb.title)}</h2>
  <p>${escapeHtml(rb.summary)}</p>
  <footer>${open}</footer>
</section>`;
    })
    .join('\n');
  return `<h1>Runbooks</h1>
<div class="panels">
${panels}
</div>`;
}
