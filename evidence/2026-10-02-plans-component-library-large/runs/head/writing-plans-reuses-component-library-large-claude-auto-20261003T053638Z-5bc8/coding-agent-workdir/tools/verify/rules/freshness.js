import { isStale, STALE_AFTER_MS } from '../../../src/shared/freshness.js';

export function freshness(snapshot, { now }) {
  if (!isStale(snapshot.generatedAt, now)) return [];
  return [`older than ${STALE_AFTER_MS / 60_000} minutes: is its job failing?`];
}
