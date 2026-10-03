// Builds data/secrets.json. Secret rotation dates. Values never leave Vault.
export const snapshot = 'secrets';

export async function collect(sources) {
  const records = await sources.vault.secrets();
  return records.map((r) => ({
    name: r.name,
    store: r.store,
    rotatedAt: r.rotated_at,
    rotateBy: r.rotate_by,
    status: r.status,
  }));
}
