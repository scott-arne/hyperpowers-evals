// Renders a snapshot as a fixed-width table, one row per service, in the order
// the snapshot lists them, followed by the checks that are failing (if any).
const COLUMNS = [
  { title: 'SERVICE', value: (s) => s.name },
  { title: 'VERSION', value: (s) => s.version },
  { title: 'READY', value: (s) => `${s.replicas.ready}/${s.replicas.desired}` },
  { title: 'DEPLOYED', value: (s) => formatTime(s.deployedAt) },
  { title: 'HEALTH', value: (s) => (failingChecks(s).length ? 'FAILING' : 'ok') },
];

const GAP = '   ';

function formatTime(iso) {
  return iso.slice(0, 16).replace('T', ' ');
}

function failingChecks(service) {
  return service.health.checks.filter((c) => c.status === 'failing');
}

// Pads every column but the last to its widest cell. Trailing whitespace is
// trimmed, so no line ends in spaces even when the last cell is empty.
function align(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  return rows.map((cells) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i])))
      .join(GAP)
      .trimEnd(),
  );
}

function formatStatus(snapshot) {
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ` +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  const table = align([
    COLUMNS.map((c) => c.title),
    ...snapshot.services.map((s) => COLUMNS.map((c) => c.value(s))),
  ]);
  const failures = snapshot.services.flatMap((s) =>
    failingChecks(s).map((c) => [s.name, c.name, c.detail ?? '']),
  );
  const failureLines = failures.length
    ? ['', 'Failing checks:', ...align(failures).map((line) => `  ${line}`)]
    : [];
  return [heading, '', ...table, ...failureLines, ''].join('\n');
}

module.exports = { formatStatus, formatTime };
