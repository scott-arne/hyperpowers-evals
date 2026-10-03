import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSnapshot } from './data.js';
import { escapeHtml } from './html.js';
import { layout } from './layout.js';
import { renderIncidents } from './pages/incidents.js';
import { renderOncall } from './pages/oncall.js';
import { renderOverview } from './pages/overview.js';
import { renderRunbooks } from './pages/runbooks.js';
import { renderServices } from './pages/services.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.css': 'text/css', '.js': 'text/javascript' };

const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
  '/oncall': { title: 'On-call', snapshot: 'oncall', render: renderOncall },
  '/runbooks': { title: 'Runbooks', snapshot: 'runbooks', render: renderRunbooks },
};

// Resolves one request to a response. Kept apart from the http server so
// tests can call it directly.
export async function handle(url, { dataDir } = {}) {
  const { pathname, searchParams } = new URL(url, 'http://harbor.local');
  if (pathname.startsWith('/public/')) return serveStatic(pathname.slice('/public/'.length));
  const route = ROUTES[pathname];
  if (!route) return page(404, 'Not found', '<h1>Not found</h1>', pathname);
  let snapshot;
  try {
    snapshot = await readSnapshot(route.snapshot, dataDir);
  } catch {
    // The pipeline rewrites snapshots in place, so a read can fail for a
    // moment. Say so instead of crashing; the next refresh usually works.
    const body = `<h1>${escapeHtml(route.title)}</h1>
<p class="muted">Snapshot unavailable, try again in a minute.</p>`;
    return page(503, route.title, body, pathname);
  }
  return page(200, route.title, route.render(snapshot, Object.fromEntries(searchParams)), pathname);
}

function page(status, title, body, active) {
  return { status, type: 'text/html; charset=utf-8', body: layout({ title, active, body }) };
}

async function serveStatic(name) {
  const type = TYPES[extname(name)];
  if (name.includes('..') || !type) return { status: 404, type: 'text/plain', body: 'Not found' };
  try {
    return { status: 200, type, body: await readFile(join(PUBLIC_DIR, name), 'utf8') };
  } catch {
    return { status: 404, type: 'text/plain', body: 'Not found' };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  createServer(async (req, res) => {
    const out = await handle(req.url);
    res.writeHead(out.status, { 'content-type': out.type });
    res.end(out.body);
  }).listen(port, () => console.log(`harbor on http://localhost:${port}`));
}
