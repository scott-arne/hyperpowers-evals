import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = fileURLToPath(new URL('./migrations/', import.meta.url));

export async function migrationFiles(dir = MIGRATIONS) {
  return (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
}

function inTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const ensureTable = (db) => db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');

// Applies the migrations not yet recorded, in file order, each in its own
// transaction.
export async function migrate(db, dir = MIGRATIONS) {
  ensureTable(db);
  const done = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
  const applied = [];
  for (const name of await migrationFiles(dir)) {
    if (done.has(name)) continue;
    const sql = await readFile(`${dir}${name}`, 'utf8');
    inTransaction(db, () => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
    });
    applied.push(name);
  }
  return applied;
}

// Undoes the latest applied migration with its twin in down/, for a release
// that has to be rolled back. Returns its name, or null when none is applied.
export async function rollback(db, dir = MIGRATIONS) {
  ensureTable(db);
  const last = db.prepare('SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 1').get();
  if (!last) return null;
  const sql = await readFile(`${dir}down/${last.name}`, 'utf8');
  inTransaction(db, () => {
    db.exec(sql);
    db.prepare('DELETE FROM schema_migrations WHERE name = ?').run(last.name);
  });
  return last.name;
}
