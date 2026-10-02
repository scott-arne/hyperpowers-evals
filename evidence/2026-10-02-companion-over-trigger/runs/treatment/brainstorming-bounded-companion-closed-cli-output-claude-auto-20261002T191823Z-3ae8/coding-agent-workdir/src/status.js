// Renders a snapshot as a fixed-width table, one row per service, in the order
// the snapshot lists them, followed by the detail of any failing health checks.
const COLUMNS = [
  { title: 'SERVICE', value: (s) => s.name },
  { title: 'VERSION', value: (s) => s.version },
  { title: 'READY', value: (s) => `${s.replicas.ready}/${s.replicas.desired}` },
  { title: 'DEPLOYED', value: (s) => formatTime(s.deployedAt) },
  { title: 'HEALTH', value: (s) => formatHealth(failingChecks(s)) },
];

const GAP = '   ';

function formatTime(iso) {
  return iso.slice(0, 16).replace('T', ' ');
}

function failingChecks(service) {
  return (service.health?.checks ?? []).filter((c) => c.status === 'failing');
}

function formatHealth(failing) {
  return failing.length === 0 ? 'ok' : `${failing.length} failing`;
}

// Pads every cell to its column's widest, except the last, so no line ends in
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
  const table = alignRows([COLUMNS.map((c) => c.title), ...rows]);
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ` +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  const failures = snapshot.services.flatMap((s) =>
    failingChecks(s).map((c) => [s.name, c.name, c.detail ?? '']),
  );
  const failureSection =
    failures.length === 0
      ? []
      : ['', 'Failing checks:', ...alignRows(failures).map((row) => `  ${row}`)];
  return [heading, '', ...table, ...failureSection, ''].join('\n');
}

module.exports = { formatStatus, formatTime };
