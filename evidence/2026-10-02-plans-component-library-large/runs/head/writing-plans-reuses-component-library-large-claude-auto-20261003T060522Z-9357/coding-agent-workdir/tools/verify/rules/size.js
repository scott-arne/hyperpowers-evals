import { formatBytes } from '../../../src/core/format/bytes.js';

const LIMIT = 1024 * 1024;

// The dashboard parses every snapshot on every request.
export function size(snapshot, { bytes }) {
  return bytes > LIMIT ? [`${formatBytes(bytes)} is over the ${formatBytes(LIMIT)} limit`] : [];
}
