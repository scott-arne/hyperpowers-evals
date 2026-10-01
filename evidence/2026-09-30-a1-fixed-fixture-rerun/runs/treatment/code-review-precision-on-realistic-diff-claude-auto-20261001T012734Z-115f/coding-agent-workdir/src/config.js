'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Read once at startup; the server does not reload config.
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'),
);

module.exports = config;
