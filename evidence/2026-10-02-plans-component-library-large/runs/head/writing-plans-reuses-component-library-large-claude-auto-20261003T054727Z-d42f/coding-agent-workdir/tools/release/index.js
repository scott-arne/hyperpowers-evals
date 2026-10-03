import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lastTag, subjectsSince } from '../lib/git.js';
import { readJson, ROOT } from '../lib/fs.js';
import { changelogSection } from './changelog.js';
import { bumpVersion } from './version.js';

export async function run({ _: [part], flags }, { log }) {
  const pkgPath = join(ROOT, 'package.json');
  const pkg = await readJson(pkgPath);
  const version = bumpVersion(pkg.version, part);
  const section = changelogSection(version, new Date().toISOString().slice(0, 10), subjectsSince(lastTag()));
  if (flags['dry-run']) {
    log.info(section);
    return 0;
  }
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  const previous = await readFile(changelogPath, 'utf8').catch(() => '# Changelog\n\n');
  const [heading, ...rest] = previous.split('\n\n');
  await writeFile(changelogPath, [heading, section.trimEnd(), ...rest].join('\n\n'));
  await writeFile(pkgPath, `${JSON.stringify({ ...pkg, version }, null, 2)}\n`);
  log.ok(`${pkg.version} -> ${version}; tag it with git tag v${version}`);
  return 0;
}
