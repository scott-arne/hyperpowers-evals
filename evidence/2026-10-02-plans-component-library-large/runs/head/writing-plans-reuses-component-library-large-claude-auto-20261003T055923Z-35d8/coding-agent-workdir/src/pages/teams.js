import { escapeHtml } from '../html.js';

// Teams by area, with their leads and whether the rotation is fully staffed.
export function renderTeams(snapshot) {
  const areas = [...new Set(snapshot.teams.map((t) => t.area))].sort();
  const panels = areas.map((area) => {
    const teams = snapshot.teams.filter((t) => t.area === area);
    const items = teams
      .map((t) => `<li>${escapeHtml(t.name)} <span class="muted">${escapeHtml(t.lead)}</span> <span class="pill ${staffingClass(t.staffing)}">${escapeHtml(t.staffing)}</span></li>`)
      .join('');
    return `<section class="panel">
  <h2>${escapeHtml(area)}</h2>
  <p>${teams.length} teams</p>
  <ul class="panel-list">${items}</ul>
</section>`;
  });
  return `<h1>Teams</h1>
<div class="panels">
${panels.join('\n')}
</div>`;
}

function staffingClass(staffing) {
  if (staffing === 'staffed') return 'pill-green';
  return 'pill-amber';
}
