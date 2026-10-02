// Renders a snapshot as a fixed-width table, one row per service, in the order
// the snapshot lists them, followed by the failing health checks, if any.
const COLUMNS = [
  { title: 'SERVICE', value: (s) => s.name },
  { title: 'VERSION', value: (s) => s.version },
  { title: 'READY', value: (s) => `${s.replicas.ready}/${s.replicas.desired}` },
  { title: 'DEPLOYED', value: (s) => formatTime(s.deployedAt) },
  { title: 'HEALTH', value: (s) => formatHealth(s.health) },
];

const GAP = '   ';
const INDENT = '  ';

function formatTime(iso) {
  return iso.slice(0, 16).replace('T', ' ');
}

function failingChecks(health) {
  return health.checks.filter((c) => c.status === 'failing');
}

function formatHealth(health) {
  const failing = failingChecks(health).length;
  return failing === 0 ? 'ok' : `${failing} failing`;
}

// Pads every cell to its column's width, except the last, so no line ends in
// spaces.
function alignRows(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  return rows.map((cells) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i])))
      .join(GAP)
      .trimEnd(),
  );
}

function formatStatus(snapshot) {
  const rows = snapshot.services.map((s) => COLUMNS.map((c) => c.value(s)));
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ` +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  const lines = [heading, '', ...alignRows([COLUMNS.map((c) => c.title), ...rows])];

  const failures = snapshot.services.flatMap((s) =>
    failingChecks(s.health).map((c) => [s.name, c.name, c.detail ?? '']),
  );
  if (failures.length > 0) {
    lines.push('', 'Failing checks:', ...alignRows(failures).map((line) => INDENT + line));
  }
  return [...lines, ''].join('\n');
}

module.exports = { formatStatus, formatTime };
