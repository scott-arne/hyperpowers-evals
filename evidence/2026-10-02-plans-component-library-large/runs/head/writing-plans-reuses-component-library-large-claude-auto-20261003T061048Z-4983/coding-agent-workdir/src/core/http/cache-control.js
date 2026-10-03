// Snapshots change every minute, so pages must not be cached; static assets
// change only on deploy.
export const NO_STORE = 'no-store';
export const STATIC = 'public, max-age=3600';
