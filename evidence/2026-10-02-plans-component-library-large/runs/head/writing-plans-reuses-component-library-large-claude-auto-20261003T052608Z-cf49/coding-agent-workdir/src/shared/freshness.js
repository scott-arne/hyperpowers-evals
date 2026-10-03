// The pipeline writes every snapshot each minute. Five minutes without a new
// one means a job is failing, which tools/verify and the overview report.
export const STALE_AFTER_MS = 5 * 60_000;

export function isStale(generatedAt, now, staleAfterMs = STALE_AFTER_MS) {
  const written = Date.parse(generatedAt);
  return Number.isNaN(written) || now - written > staleAfterMs;
}
