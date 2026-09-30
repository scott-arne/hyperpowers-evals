'use strict';

function error(message, err) {
  process.stderr.write(`${message}: ${err && err.message}\n`);
}

module.exports = { error };
