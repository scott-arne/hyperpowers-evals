// Builds data/vendors.json. Third-party status, polled from each vendor page.
export const snapshot = 'vendors';

export async function collect(sources) {
  const records = await sources.statuspage.vendors();
  return records.map((r) => ({
    name: r.name,
    category: r.category,
    status: r.status,
    checkedAt: r.checked_at,
    statusPage: r.status_page,
  }));
}
