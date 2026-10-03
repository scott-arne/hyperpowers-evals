// Builds data/services.json. Deployed services and their health checks, one row per service and environment.
import { healthFromChecks } from '../analysis/health.js';

export const snapshot = 'services';

export async function collect(sources) {
  const records = await sources.kubernetes.deployments();
  return records.map((r) => ({
    name: r.name,
    version: r.version,
    environment: r.environment,
    health: healthFromChecks(r.checks_passed, r.checks_total),
    deployedAt: r.deployed_at,
  }));
}
