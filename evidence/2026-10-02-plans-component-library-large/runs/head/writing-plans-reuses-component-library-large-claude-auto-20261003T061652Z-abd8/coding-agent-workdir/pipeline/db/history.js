// Quoted, because some fields (group, primary) are SQL keywords.
const column = (field) => `"${field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}"`;

export function startRun(db, startedAt) {
  return db.prepare('INSERT INTO runs (started_at) VALUES (?)').run(startedAt).lastInsertRowid;
}

export function finishRun(db, runId, { finishedAt, jobs, failed }) {
  db.prepare('UPDATE runs SET finished_at = ?, jobs = ?, failed = ? WHERE id = ?').run(finishedAt, jobs, failed, runId);
}

// One history row per snapshot row. Booleans are stored as 0 and 1.
export function appendHistory(db, snapshot, runId, rows, fields) {
  const names = Object.keys(fields);
  const sql = `INSERT INTO ${snapshot}_history (run_id, ${names.map(column).join(', ')}) VALUES (?${', ?'.repeat(names.length)})`;
  const insert = db.prepare(sql);
  for (const row of rows) {
    insert.run(runId, ...names.map((n) => (typeof row[n] === 'boolean' ? Number(row[n]) : row[n])));
  }
}
