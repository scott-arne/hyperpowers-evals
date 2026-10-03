// Builds data/runbooks.json. Runbooks from the wiki, by label.
export const snapshot = 'runbooks';

export async function collect(sources) {
  const records = await sources.wiki.runbooks();
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    url: r.url,
  }));
}
