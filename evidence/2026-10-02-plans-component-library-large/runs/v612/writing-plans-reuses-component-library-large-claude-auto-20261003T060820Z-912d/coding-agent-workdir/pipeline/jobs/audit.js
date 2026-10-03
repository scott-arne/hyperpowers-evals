// Builds data/audit.json. The audit trail of deploys, rollbacks, config changes and access grants.
export const snapshot = 'audit';

export async function collect(sources) {
  const records = await sources.ci.auditLog();
  return records.map((r) => ({
    at: r.at,
    actor: r.actor,
    action: r.action,
    target: r.target,
    result: r.result,
  }));
}
