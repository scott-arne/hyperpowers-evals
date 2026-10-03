// data/backups.json: The latest backup of each database.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'backups';

export const fields = {
  database: 'string',
  kind: 'string',
  size: 'string',
  finishedAt: 'timestamp',
  status: 'string',
};
