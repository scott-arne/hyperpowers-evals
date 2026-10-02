// Renders a snapshot as a fixed-width table, one row per service, in the order
// the snapshot lists them.
const COLUMNS = [
  { title: 'SERVICE', value: (s) => s.name },
  { title: 'VERSION', value: (s) => s.version },
  { title: 'READY', value: (s) => `${s.replicas.ready}/${s.replicas.desired}` },
  { title: 'DEPLOYED', value: (s) => formatTime(s.deployedAt) },
  { title: 'HEALTH', value: (s) => formatHealth(s.health) },
];

const GAP = '   ';

function formatTime(iso) {
  return iso.slice(0, 16).replace('T', ' ');
}

function failingChecks(health) {
  return health.checks.filter((c) => c.status === 'failing');
}

// Names the failing checks; the detail stays in the snapshot to keep rows short.
function formatHealth(health) {
  if (health.checks.length === 0) return 'no checks';
  const failing = failingChecks(health);
  if (failing.length === 0) return 'ok';
  return `failing: ${failing.map((c) => c.name).join(', ')}`;
}

function formatStatus(snapshot) {
  const rows = snapshot.services.map((s) => COLUMNS.map((c) => c.value(s)));
  const widths = COLUMNS.map((c, i) =>
    Math.max(c.title.length, ...rows.map((row) => row[i].length)),
  );
  // The last column is not padded, so no line ends in spaces.
  const line = (cells) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i])))
      .join(GAP);
  const unhealthy = snapshot.services.filter((s) => failingChecks(s.health).length > 0);
  const health =
    unhealthy.length === 0
      ? 'all passing health checks'
      : `${unhealthy.length} with failing health checks`;
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ${health}, ` +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  return [heading, '', line(COLUMNS.map((c) => c.title)), ...rows.map(line), ''].join('\n');
}

module.exports = { formatStatus, formatTime };
