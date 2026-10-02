import { esc } from './ui/index.js';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
];

export function layout({ title, active, body }) {
  const nav = NAV.map((item) => {
    const current = item.href === active ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${current}>${esc(item.label)}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)} · Harbor</title>
<link rel="stylesheet" href="/public/harbor.css">
<link rel="stylesheet" href="/public/app.css">
<script src="/public/harbor.js" defer></script>
</head>
<body>
<nav class="ui-nav">${nav}</nav>
<main class="ui-main">
${body}
</main>
</body>
</html>`;
}
