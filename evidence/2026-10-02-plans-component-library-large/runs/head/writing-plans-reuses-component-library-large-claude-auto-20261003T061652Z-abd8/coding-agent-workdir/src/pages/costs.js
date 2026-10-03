import { escapeHtml } from '../html.js';

// Month-to-date spend against budget, one panel per team.
export function renderCosts(snapshot) {
  const teams = [...new Set(snapshot.budgets.map((b) => b.team))].sort();
  const panels = teams.map((team) => {
    const budgets = snapshot.budgets.filter((b) => b.team === team);
    const items = budgets
      .map((b) => `<li>${escapeHtml(b.service)} <span class="muted">${escapeHtml(b.spent)}</span> <span class="pill ${statusClass(b.status)}">${escapeHtml(b.status)}</span></li>`)
      .join('');
    return `<section class="panel">
  <h2>${escapeHtml(team)}</h2>
  <p>${budgets.length} services</p>
  <ul class="panel-list">${items}</ul>
</section>`;
  });
  return `<h1>Costs</h1>
<div class="panels">
${panels.join('\n')}
</div>`;
}

function statusClass(status) {
  if (status === 'under') return 'pill-green';
  if (status === 'near') return 'pill-amber';
  return 'pill-red';
}
