// Builds data/domains.json. Registered domains and whether their records resolve.
export const snapshot = 'domains';

export async function collect(sources) {
  const records = await sources.dns.domains();
  return records.map((r) => ({
    name: r.name,
    registrar: r.registrar,
    expiresAt: r.expires_at,
    dns: r.dns,
  }));
}
