// Renders a snapshot as a fixed-width table, one row per service, in the order
// the snapshot lists them, followed by the details of any failing health checks.
const COLUMNS = [
  { title: 'SERVICE', value: (s) => s.name },
  { title: 'VERSION', value: (s) => s.version },
  { title: 'READY', value: (s) => `${s.replicas.ready}/${s.replicas.desired}` },
  { title: 'DEPLOYED', value: (s) => formatTime(s.deployedAt) },
  { title: 'HEALTH', value: formatHealth },
];

const GAP = '   ';

function formatTime(iso) {
  return iso.slice(0, 16).replace('T', ' ');
}

function failingChecks(service) {
  return service.health.checks.filter((c) => c.status === 'failing');
}

function formatHealth(service) {
  const failing = failingChecks(service).length;
  return failing === 0 ? 'ok' : `${failing}/${service.health.checks.length} failing`;
}

// Pads every cell but the last to its column's width, so no line ends in spaces.
function alignRows(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  return rows.map((cells) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i])))
      .join(GAP),
  );
}

function formatStatus(snapshot) {
  const { services } = snapshot;
  const table = alignRows([
    COLUMNS.map((c) => c.title),
    ...services.map((s) => COLUMNS.map((c) => c.value(s))),
  ]);
  const failures = services.flatMap((s) =>
    failingChecks(s).map((c) => [s.name, c.name, c.detail ?? '']),
  );
  const unhealthy = services.filter((s) => failingChecks(s).length > 0).length;
  const heading =
    `${snapshot.environment}: ${services.length} services, ` +
    `${unhealthy} with failing health checks, ` +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  const details =
    failures.length === 0
      ? []
      : ['', 'Failing checks:', ...alignRows(failures).map((row) => `  ${row}`)];
  return [heading, '', ...table, ...details, ''].join('\n');
}

module.exports = { formatStatus, formatTime };
