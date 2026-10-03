// Builds data/flags.json. Feature flags and their rollout in each environment.
export const snapshot = 'flags';

export async function collect(sources) {
  const records = await sources.launchdarkly.flags();
  return records.map((r) => ({
    name: r.name,
    environment: r.environment,
    state: r.state,
    rollout: r.rollout,
    owner: r.owner,
    updatedAt: r.updated_at,
  }));
}
