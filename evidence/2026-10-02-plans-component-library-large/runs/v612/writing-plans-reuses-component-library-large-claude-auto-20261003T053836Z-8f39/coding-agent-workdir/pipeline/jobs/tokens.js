// Builds data/tokens.json. API tokens and when they were last used.
export const snapshot = 'tokens';

export async function collect(sources) {
  const records = await sources.vault.tokens();
  return records.map((r) => ({
    name: r.name,
    owner: r.owner,
    scopes: r.scopes,
    lastUsed: r.last_used,
    expiresAt: r.expires_at,
    status: r.status,
  }));
}
