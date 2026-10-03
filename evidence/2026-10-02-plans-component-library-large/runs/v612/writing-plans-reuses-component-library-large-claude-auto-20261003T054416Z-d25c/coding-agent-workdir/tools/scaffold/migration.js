import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { migrationFiles } from '../../pipeline/db/migrate.js';
import { ROOT } from '../lib/fs.js';
import { renderTemplate } from './render.js';

export async function scaffoldMigration(slug) {
  const files = await migrationFiles();
  const next = String(files.length + 1).padStart(4, '0');
  const target = `pipeline/db/migrations/${next}_${slug.replace(/-/g, '_')}.sql`;
  const sql = await renderTemplate(new URL('./templates/migration.sql.tpl', import.meta.url), { slug });
  await writeFile(join(ROOT, target), sql, { flag: 'wx' });
  return target;
}
