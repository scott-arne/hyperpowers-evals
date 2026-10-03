import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './client.js';
import { migrate, migrationFiles, rollback } from './migrate.js';

const DOWN = fileURLToPath(new URL('./migrations/down/', import.meta.url));

test('migrations are numbered in sequence with unique names', async () => {
  const files = await migrationFiles();
  files.forEach((file, i) => {
    assert.match(file, /^\d{4}_[a-z_]+\.sql$/);
    assert.equal(Number(file.slice(0, 4)), i + 1, `${file} is out of sequence`);
  });
  assert.equal(new Set(files.map((f) => f.slice(5))).size, files.length);
});

test('every migration has a down migration', async () => {
  assert.deepEqual(await migrationFiles(DOWN), await migrationFiles());
});

test('migrates up and all the way back down', async () => {
  const db = await openDatabase(':memory:');
  const applied = await migrate(db);
  for (const name of applied.reverse()) assert.equal(await rollback(db), name);
  assert.equal(await rollback(db), null);
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE tbl_name != 'schema_migrations'").all(), []);
});
