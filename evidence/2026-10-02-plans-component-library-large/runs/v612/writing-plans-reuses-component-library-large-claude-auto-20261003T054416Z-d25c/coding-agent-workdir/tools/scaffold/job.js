import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../lib/fs.js';
import { renderTemplate } from './render.js';

const TEMPLATES = new URL('./templates/', import.meta.url);
const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());

// Writes the job, its test and an empty fixture. Register the job in
// pipeline/jobs/index.js and add its schema by hand.
export async function scaffoldJob(snapshot, source) {
  const [client, method] = source.split('.');
  const values = { snapshot, client: camel(client), method };
  const files = [
    [`pipeline/jobs/${snapshot}.js`, 'job.js.tpl'],
    [`pipeline/jobs/${snapshot}.test.js`, 'job.test.js.tpl'],
  ];
  const written = [];
  for (const [target, template] of files) {
    await writeFile(join(ROOT, target), await renderTemplate(new URL(template, TEMPLATES), values), { flag: 'wx' });
    written.push(target);
  }
  const fixture = `pipeline/jobs/fixtures/${snapshot}.json`;
  await writeFile(join(ROOT, fixture), '[]\n', { flag: 'wx' });
  return [...written, fixture];
}
