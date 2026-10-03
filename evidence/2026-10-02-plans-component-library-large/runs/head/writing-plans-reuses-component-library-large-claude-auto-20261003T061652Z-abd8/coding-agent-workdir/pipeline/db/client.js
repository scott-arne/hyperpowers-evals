// node:sqlite needs Node 22.5 or later, so it is imported only when the
// history database is configured; the dashboard and the jobs never load it.
export async function openDatabase(path) {
  const { DatabaseSync } = await import('node:sqlite');
  return new DatabaseSync(path);
}
