// Builds data/{{snapshot}}.json.
export const snapshot = '{{snapshot}}';

export async function collect(sources) {
  const records = await sources.{{client}}.{{method}}();
  return records.map((r) => ({
    // Map each source field to its camelCase snapshot field here.
  }));
}
