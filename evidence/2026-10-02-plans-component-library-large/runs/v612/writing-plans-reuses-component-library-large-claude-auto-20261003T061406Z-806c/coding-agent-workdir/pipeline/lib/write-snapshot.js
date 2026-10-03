import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Written in place, not renamed over: the data directory is a mounted volume
// where rename is not atomic anyway, and the dashboard answers a torn read
// with a 503 that the next refresh clears.
export async function writeSnapshot(dir, name, text) {
  await writeFile(join(dir, `${name}.json`), text);
}
