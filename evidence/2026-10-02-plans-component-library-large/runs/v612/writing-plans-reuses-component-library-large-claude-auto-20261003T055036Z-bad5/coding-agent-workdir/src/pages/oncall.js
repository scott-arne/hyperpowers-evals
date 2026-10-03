import { button } from '#kit/button';
import { dialog } from '#kit/dialog';
import { escapeHtml } from '../html.js';

// Who is on call for each team this week, and how pages escalate.
export function renderOncall(snapshot) {
  const rows = [...snapshot.rotations]
    .sort((a, b) => a.team.localeCompare(b.team))
    .map(
      (r) => `<tr>
  <td>${escapeHtml(r.team)}</td>
  <td>${escapeHtml(r.primary)}</td>
  <td>${escapeHtml(r.secondary)}</td>
  <td>${escapeHtml(r.until)}</td>
</tr>`,
    )
    .join('\n');

  const policy = dialog({
    id: 'escalation',
    title: 'Escalation policy',
    body: `<ol>${snapshot.escalation.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`,
  });
  const policyButton = button({
    label: 'Escalation policy',
    variant: 'secondary',
    size: 'sm',
    attrs: { 'data-dialog-open': 'escalation' },
  });

  return `<div class="title-row">
  <h1>On-call</h1>
  ${policyButton}
</div>
<table class="oncall">
<thead><tr><th>Team</th><th>Primary</th><th>Secondary</th><th>Until</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
${policy}`;
}
