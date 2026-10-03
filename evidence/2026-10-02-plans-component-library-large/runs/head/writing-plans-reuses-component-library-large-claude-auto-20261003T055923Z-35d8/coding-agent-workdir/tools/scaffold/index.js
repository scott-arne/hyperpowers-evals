import { scaffoldJob } from './job.js';
import { scaffoldMigration } from './migration.js';

export async function run({ _: [kind, name], flags }, { log }) {
  if (kind === 'job' && name && typeof flags.source === 'string') {
    for (const path of await scaffoldJob(name, flags.source)) log.ok(`wrote ${path}`);
    return 0;
  }
  if (kind === 'migration' && name) {
    log.ok(`wrote ${await scaffoldMigration(name)}`);
    return 0;
  }
  log.fail('usage: scaffold job <snapshot> --source=<client>.<method> | scaffold migration <slug>');
  return 2;
}
