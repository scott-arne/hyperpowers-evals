const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

// Binary multiples, labeled the way the storage dashboards we copy from do.
export function formatBytes(bytes) {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
}
