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

function formatHealth(health) {
  const failing = failingChecks(health);
  return failing.length === 0 ? 'ok' : `failing: ${failing.map((c) => c.name).join(', ')}`;
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
  const unhealthy = snapshot.services.filter((s) => failingChecks(s.health).length > 0).length;
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ` +
    (unhealthy > 0 ? `${unhealthy} with failing health checks, ` : '') +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  return [heading, '', line(COLUMNS.map((c) => c.title)), ...rows.map(line), ''].join('\n');
}

module.exports = { formatStatus, formatTime };
