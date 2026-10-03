// Exponential backoff with full jitter. `random` is injectable for tests.
export function backoff(attempt, { baseMs = 200, maxMs = 10_000, random = Math.random } = {}) {
  const ceiling = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(random() * ceiling);
}
