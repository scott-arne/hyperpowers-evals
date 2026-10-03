// Above 80% we file a quota request; above 95% autoscaling starts failing.
export function capacityStatus(used, total) {
  if (used > total * 0.95) return 'full';
  return used > total * 0.8 ? 'tight' : 'ok';
}
