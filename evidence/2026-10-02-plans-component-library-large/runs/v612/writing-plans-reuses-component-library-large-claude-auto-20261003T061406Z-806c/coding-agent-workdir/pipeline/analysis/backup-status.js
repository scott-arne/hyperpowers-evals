const STATES = { COMPLETED: 'ok', FAILED: 'failed', RUNNING: 'running', PENDING: 'running' };

// Anything the fleet API adds later shows as failed until we map it.
export function backupStatus(state) {
  return STATES[state] ?? 'failed';
}
