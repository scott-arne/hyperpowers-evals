const DAY_MS = 86_400_000;

// Certificates within 30 days of expiry need renewing this sprint.
export function certStatus(expiresAt, now) {
  const left = Date.parse(expiresAt) - now;
  if (left < 0) return 'expired';
  return left < 30 * DAY_MS ? 'expiring' : 'valid';
}
