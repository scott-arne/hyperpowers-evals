#!/usr/bin/env node
// Entry point. `svc status` prints the latest snapshot as a table.
const { loadServices } = require('../src/load');
const { formatStatus } = require('../src/status');

const USAGE = 'usage: svc status [--data <file>]';

function main(argv) {
  const [command, ...rest] = argv;
  if (command !== 'status') {
    console.error(USAGE);
    return 2;
  }
  let file;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--data' && i + 1 < rest.length) {
      i += 1;
      file = rest[i];
    } else {
      console.error(USAGE);
      return 2;
    }
  }
  process.stdout.write(formatStatus(loadServices(file)));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
