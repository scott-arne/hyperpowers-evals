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

// "ok" when nothing is failing, otherwise the failing checks by name.
function formatHealth(health) {
  const failing = health.checks.filter((c) => c.status === 'failing').map((c) => c.name);
  return failing.length === 0 ? 'ok' : `failing: ${failing.join(', ')}`;
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
  const heading =
    `${snapshot.environment}: ${snapshot.services.length} services, ` +
    `as of ${formatTime(snapshot.generatedAt)} UTC`;
  return [heading, '', line(COLUMNS.map((c) => c.title)), ...rows.map(line), ''].join('\n');
}

module.exports = { formatStatus, formatTime };
