import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const files = readdirSync(new URL('./contracts/', import.meta.url), { recursive: true }).filter((f) => f.endsWith('.json'));

// A contract lists the fields a job reads from one upstream collection. A
// recording that stops matching means the upstream changed shape, and the job
// has to follow before the next real run fails validation.
for (const file of files.sort()) {
  test(`${file.replace(/\.json$/, '')}: the recording matches its contract`, () => {
    const contract = read(`./contracts/${file}`);
    read(`./recordings/${file}`).forEach((record, i) => assert.deepEqual(checkShape(record, contract), [], `record ${i}`));
  });
}
