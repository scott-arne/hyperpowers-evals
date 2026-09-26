const { slugify } = require('./slugify');
const { truncate } = require('./truncate');

function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet, slugify, truncate };
