const STATES = { running: 'up', stopping: 'draining', stopped: 'down', terminated: 'down' };

export function hostStatus(state) {
  return STATES[state] ?? 'down';
}
