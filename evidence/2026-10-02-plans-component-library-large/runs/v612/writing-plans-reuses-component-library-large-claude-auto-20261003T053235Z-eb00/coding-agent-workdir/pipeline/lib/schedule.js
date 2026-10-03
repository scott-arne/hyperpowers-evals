const UNITS = { s: 1000, m: 60_000, h: 3_600_000 };

// "30s", "1m", "6h" to milliseconds.
export function parseInterval(text) {
  const match = /^(\d+)([smh])$/.exec(text);
  if (!match) throw new Error(`bad interval: ${text}`);
  return Number(match[1]) * UNITS[match[2]];
}

// Jobs run every minute unless they export `every`; slow upstreams such as
// the billing export only change a few times a day.
export function isDue(job, lastRunMs, now) {
  if (lastRunMs === undefined) return true;
  return now - lastRunMs >= parseInterval(job.every ?? '1m');
}
