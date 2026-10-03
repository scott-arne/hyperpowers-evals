import { escapeHtml } from '../html.js';

// Scheduled jobs, by name. ?state=failed shows only the jobs whose last run
// failed.
export function renderJobs(snapshot, query) {
  const state = query.state === 'failed' ? 'failed' : 'all';
  const jobs = snapshot.jobs
    .filter((j) => state === 'all' || j.state === 'failed')
    .sort((a, b) => a.name.localeCompare(b.name));

  const tab = (value, label) => {
    const current = value === state ? ' aria-current="page"' : '';
    return `<a href="/jobs?state=${value}"${current}>${label}</a>`;
  };

  const items = jobs
    .map((j) => {
      return `<li class="list-item">
  <span class="pill ${stateClass(j.state)}">${escapeHtml(j.state)}</span>
  <strong>${escapeHtml(j.name)}</strong>
  <span class="muted">${escapeHtml(j.schedule)}, last run ${escapeHtml(j.lastRun)}</span>
</li>`;
    })
    .join('\n');

  const list =
    jobs.length === 0
      ? '<p class="muted">No jobs to show.</p>'
      : `<ul class="list">
${items}
</ul>`;

  return `<h1>Jobs</h1>
<nav class="subnav">${tab('all', 'All')}${tab('failed', 'Failed')}</nav>
${list}`;
}

function stateClass(state) {
  if (state === 'ok') return 'pill-green';
  if (state === 'running') return 'pill-grey';
  return 'pill-red';
}
