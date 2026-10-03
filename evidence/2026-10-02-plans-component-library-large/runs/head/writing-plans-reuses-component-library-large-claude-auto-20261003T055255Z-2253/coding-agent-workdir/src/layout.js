import { escapeHtml } from './html.js';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/oncall', label: 'On-call' },
  { href: '/runbooks', label: 'Runbooks' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/hosts', label: 'Hosts' },
  { href: '/clusters', label: 'Clusters' },
  { href: '/databases', label: 'Databases' },
  { href: '/queues', label: 'Queues' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/certificates', label: 'Certificates' },
  { href: '/domains', label: 'Domains' },
  { href: '/costs', label: 'Costs' },
  { href: '/capacity', label: 'Capacity' },
  { href: '/slos', label: 'SLOs' },
  { href: '/maintenance', label: 'Maintenance' },
  { href: '/changes', label: 'Changes' },
  { href: '/flags', label: 'Flags' },
  { href: '/backups', label: 'Backups' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/teams', label: 'Teams' },
  { href: '/audit', label: 'Audit log' },
  { href: '/endpoints', label: 'Endpoints' },
  { href: '/regions', label: 'Regions' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/status', label: 'Status' },
  { href: '/reports', label: 'Reports' },
  { href: '/secrets', label: 'Secrets' },
  { href: '/webhooks', label: 'Webhooks' },
];

export function layout({ title, active, body }) {
  const nav = NAV.map((item) => {
    const current = item.href === active ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${current}>${escapeHtml(item.label)}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="icon" href="/public/img/favicon.svg">
<title>${escapeHtml(title)} · Harbor</title>
<link rel="stylesheet" href="/public/kit.css">
<link rel="stylesheet" href="/public/app.css">
<script src="/public/kit.js" defer></script>
</head>
<body>
<nav class="topnav">${nav}</nav>
<main>
${body}
</main>
</body>
</html>`;
}
