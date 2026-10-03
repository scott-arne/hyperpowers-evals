// Any failing check degrades a service; all of them failing means it is down.
export function healthFromChecks(passed, total) {
  if (passed === total) return 'passing';
  return passed === 0 ? 'failing' : 'degraded';
}
