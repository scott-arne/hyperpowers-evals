import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './core/config/load.js';
import { readSnapshot } from './data.js';
import { escapeHtml } from './html.js';
import { layout } from './layout.js';
import { renderAlerts } from './pages/alerts.js';
import { renderAudit } from './pages/audit.js';
import { renderBackups } from './pages/backups.js';
import { renderCapacity } from './pages/capacity.js';
import { renderCertificates } from './pages/certificates.js';
import { renderChanges } from './pages/changes.js';
import { renderClusters } from './pages/clusters.js';
import { renderCosts } from './pages/costs.js';
import { renderDatabases } from './pages/databases.js';
import { renderDomains } from './pages/domains.js';
import { renderEndpoints } from './pages/endpoints.js';
import { renderFlags } from './pages/flags.js';
import { renderHosts } from './pages/hosts.js';
import { renderIncidents } from './pages/incidents.js';
import { renderJobs } from './pages/jobs.js';
import { renderMaintenance } from './pages/maintenance.js';
import { renderOncall } from './pages/oncall.js';
import { renderOverview } from './pages/overview.js';
import { renderQueues } from './pages/queues.js';
import { renderRegions } from './pages/regions.js';
import { renderReports } from './pages/reports.js';
import { renderRunbooks } from './pages/runbooks.js';
import { renderSecrets } from './pages/secrets.js';
import { renderServices } from './pages/services.js';
import { renderSlos } from './pages/slos.js';
import { renderStatus } from './pages/status.js';
import { renderTeams } from './pages/teams.js';
import { renderTokens } from './pages/tokens.js';
import { renderVendors } from './pages/vendors.js';
import { renderWebhooks } from './pages/webhooks.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
  '/oncall': { title: 'On-call', snapshot: 'oncall', render: renderOncall },
  '/runbooks': { title: 'Runbooks', snapshot: 'runbooks', render: renderRunbooks },
  '/alerts': { title: 'Alerts', snapshot: 'alerts', render: renderAlerts },
  '/hosts': { title: 'Hosts', snapshot: 'hosts', render: renderHosts },
  '/clusters': { title: 'Clusters', snapshot: 'clusters', render: renderClusters },
  '/databases': { title: 'Databases', snapshot: 'databases', render: renderDatabases },
  '/queues': { title: 'Queues', snapshot: 'queues', render: renderQueues },
  '/jobs': { title: 'Jobs', snapshot: 'jobs', render: renderJobs },
  '/certificates': { title: 'Certificates', snapshot: 'certificates', render: renderCertificates },
  '/domains': { title: 'Domains', snapshot: 'domains', render: renderDomains },
  '/costs': { title: 'Costs', snapshot: 'costs', render: renderCosts },
  '/capacity': { title: 'Capacity', snapshot: 'capacity', render: renderCapacity },
  '/slos': { title: 'SLOs', snapshot: 'slos', render: renderSlos },
  '/maintenance': { title: 'Maintenance', snapshot: 'maintenance', render: renderMaintenance },
  '/changes': { title: 'Changes', snapshot: 'changes', render: renderChanges },
  '/flags': { title: 'Flags', snapshot: 'flags', render: renderFlags },
  '/backups': { title: 'Backups', snapshot: 'backups', render: renderBackups },
  '/tokens': { title: 'Tokens', snapshot: 'tokens', render: renderTokens },
  '/teams': { title: 'Teams', snapshot: 'teams', render: renderTeams },
  '/audit': { title: 'Audit log', snapshot: 'audit', render: renderAudit },
  '/endpoints': { title: 'Endpoints', snapshot: 'endpoints', render: renderEndpoints },
  '/regions': { title: 'Regions', snapshot: 'regions', render: renderRegions },
  '/vendors': { title: 'Vendors', snapshot: 'vendors', render: renderVendors },
  '/status': { title: 'Status', snapshot: 'status', render: renderStatus },
  '/reports': { title: 'Reports', snapshot: 'reports', render: renderReports },
  '/secrets': { title: 'Secrets', snapshot: 'secrets', render: renderSecrets },
  '/webhooks': { title: 'Webhooks', snapshot: 'webhooks', render: renderWebhooks },
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
  const { port, dataDir } = loadConfig();
  createServer(async (req, res) => {
    const out = await handle(req.url, { dataDir });
    res.writeHead(out.status, { 'content-type': out.type });
    res.end(out.body);
  }).listen(port, () => console.log(`harbor on http://localhost:${port}`));
}
