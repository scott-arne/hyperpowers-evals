// Maintenance commands for Harbor:
//
//   node tools/harbor.js verify [--data=dir] [--now=iso]
//   node tools/harbor.js scaffold job <snapshot> --source=<client>.<method>
//   node tools/harbor.js scaffold migration <slug>
//   node tools/harbor.js release <major|minor|patch> [--dry-run]
import { parseArgs } from './lib/args.js';
import { createToolLog } from './lib/log.js';

const COMMANDS = {
  verify: () => import('./verify/index.js'),
  scaffold: () => import('./scaffold/index.js'),
  release: () => import('./release/index.js'),
};

const [name, ...rest] = process.argv.slice(2);
const log = createToolLog();
if (!COMMANDS[name]) {
  log.fail(`usage: node tools/harbor.js <${Object.keys(COMMANDS).join('|')}> [args]`);
  process.exitCode = 2;
} else {
  const { run } = await COMMANDS[name]();
  process.exitCode = await run(parseArgs(rest), { log });
}
