// Renders a snapshot as a fixed-width table, one row per service, in the order
// the snapshot lists them, followed by the details of any failing health checks.
const failingChecks = (s) => s.health.checks.filter((c) => c.status === 'failing');

const COLUMNS = [
  { title: 'SERVICE', value: (s) => s.name },
  { title: 'VERSION', value: (s) => s.version },
  { title: 'READY', value: (s) => `${s.replicas.ready}/${s.replicas.desired}` },
  { title: 'DEPLOYED', value: (s) => formatTime(s.deployedAt) },
  {
    title: 'HEALTH',
    value: (s) => {
      const failing = failingChecks(s).length;
      return failing === 0 ? 'ok' : `${failing} failing`;
    },
  },
];

const GAP = '   ';

function formatTime(iso) {
  return iso.slice(0, 16).replace('T', ' ');
}

// Lays out rows in aligned columns. The last column is not padded, so no line
// ends in spaces.
function align(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  return rows.map((cells) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i])))
      .join(GAP),
  );
}

function formatStatus(snapshot) {
  const rows = snapshot.services.map((s) => COLUMNS.map((c) => c.value(s)));
  const failures = snapshot.services.flatMap((s) =>
    failingChecks(s).map((c) => [s.name, c.name, c.detail ?? '']),
  );
  const health =
    failures.length === 0
      ? 'all healthy'
      : `${failures.length} failing health check${failures.length === 1 ? '' : 's'}`;
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ${health}, ` +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  const lines = [heading, '', ...align([COLUMNS.map((c) => c.title), ...rows])];
  if (failures.length > 0) {
    lines.push('', 'Failing checks:', ...align(failures).map((l) => `  ${l}`));
  }
  return [...lines, ''].join('\n');
}

module.exports = { formatStatus, formatTime };
