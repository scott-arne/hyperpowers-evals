import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function listFiles(dir, extension) {
  return (await readdir(dir)).filter((f) => f.endsWith(extension)).sort().map((f) => join(dir, f));
}
