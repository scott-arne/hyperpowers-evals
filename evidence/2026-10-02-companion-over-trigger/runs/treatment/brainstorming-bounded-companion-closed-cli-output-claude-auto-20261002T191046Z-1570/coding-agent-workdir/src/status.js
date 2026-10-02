// Renders a snapshot as a fixed-width table, one row per service, in the order
// the snapshot lists them, followed by the details of any failing checks.
const COLUMNS = [
  { title: 'SERVICE', value: (s) => s.name },
  { title: 'VERSION', value: (s) => s.version },
  { title: 'READY', value: (s) => `${s.replicas.ready}/${s.replicas.desired}` },
  { title: 'DEPLOYED', value: (s) => formatTime(s.deployedAt) },
  { title: 'HEALTH', value: (s) => formatHealth(s) },
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
  return failing === 0 ? 'ok' : `${failing} failing`;
}

// Pads every cell to its column's width. The last cell is not padded, and
// trailing empty cells are dropped, so no line ends in spaces.
function alignRows(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  return rows.map((row) =>
    row
      .map((cell, i) => (i === row.length - 1 ? cell : cell.padEnd(widths[i])))
      .join(GAP)
      .trimEnd(),
  );
}

function formatStatus(snapshot) {
  const unhealthy = snapshot.services.filter((s) => failingChecks(s).length > 0);
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ` +
    (unhealthy.length > 0 ? `${unhealthy.length} unhealthy, ` : '') +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  const table = alignRows([
    COLUMNS.map((c) => c.title),
    ...snapshot.services.map((s) => COLUMNS.map((c) => c.value(s))),
  ]);
  const lines = [heading, '', ...table];
  const failures = unhealthy.flatMap((s) =>
    failingChecks(s).map((c) => [s.name, c.name, c.detail ?? '']),
  );
  if (failures.length > 0) {
    lines.push('', 'Failing checks:', ...alignRows(failures).map((line) => `  ${line}`));
  }
  return [...lines, ''].join('\n');
}

module.exports = { formatStatus, formatTime };
