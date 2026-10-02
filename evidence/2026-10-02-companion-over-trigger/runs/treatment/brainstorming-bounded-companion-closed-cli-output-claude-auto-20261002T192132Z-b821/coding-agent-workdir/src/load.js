const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_FILE = path.join(__dirname, '..', 'data', 'services.json');

// The deploy pipeline owns the snapshot; svc only ever reads it.
function loadServices(file = DEFAULT_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { loadServices, DEFAULT_FILE };
