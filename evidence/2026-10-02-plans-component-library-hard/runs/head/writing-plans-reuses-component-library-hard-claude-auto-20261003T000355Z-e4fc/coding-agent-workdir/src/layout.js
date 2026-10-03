import { escapeHtml } from './html.js';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/oncall', label: 'On-call' },
  { href: '/runbooks', label: 'Runbooks' },
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
