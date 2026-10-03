// Builds data/reports.json. Operations reports from the wiki, newest first.
export const snapshot = 'reports';

export async function collect(sources) {
  const records = await sources.wiki.reports();
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    period: r.period,
    owner: r.owner,
    publishedAt: r.published_at,
    state: r.state,
    url: r.url,
  }));
}
