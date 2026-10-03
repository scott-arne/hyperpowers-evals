// Builds data/backups.json. The latest backup of each database.
import { backupStatus } from '../analysis/backup-status.js';

export const snapshot = 'backups';

export async function collect(sources) {
  const records = await sources.postgres.backups();
  return records.map((r) => ({
    database: r.database,
    kind: r.kind,
    size: r.size,
    finishedAt: r.finished_at,
    status: backupStatus(r.state),
  }));
}
