import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderTemplate } from './render.js';

test('fills placeholders and refuses unknown ones', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'harbor-tpl-')), 't.tpl');
  await writeFile(path, 'job {{snapshot}} reads {{client}}');
  assert.equal(await renderTemplate(path, { snapshot: 'queues', client: 'rabbitmq' }), 'job queues reads rabbitmq');
  await assert.rejects(renderTemplate(path, { snapshot: 'queues' }), /no value for \{\{client\}\}/);
});
