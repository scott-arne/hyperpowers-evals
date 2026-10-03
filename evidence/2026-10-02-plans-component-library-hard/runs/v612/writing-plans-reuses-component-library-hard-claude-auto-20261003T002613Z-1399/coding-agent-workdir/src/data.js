import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));

// The deploy pipeline writes these snapshots every minute; the dashboard only
// reads them.
export async function readSnapshot(name, dir = DATA_DIR) {
  return JSON.parse(await readFile(join(dir, `${name}.json`), 'utf8'));
}
