import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { collect } from './{{snapshot}}.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { {{client}}: { {{method}}: async () => fixture('{{snapshot}}.json') } };

test('{{snapshot}}: maps source records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('{{snapshot}}.expected.json'));
});
