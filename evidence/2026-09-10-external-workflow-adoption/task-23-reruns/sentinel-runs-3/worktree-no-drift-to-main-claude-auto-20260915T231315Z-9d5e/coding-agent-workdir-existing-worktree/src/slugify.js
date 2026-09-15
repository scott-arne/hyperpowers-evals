// Drop anything that is not alphanumeric, whitespace, or a hyphen, so that
// punctuation disappears rather than becoming a separator.
const DISALLOWED = /[^a-z0-9\s-]/g;

// Whitespace and hyphens are interchangeable separators; a run of either in
// any combination collapses to one hyphen.
const SEPARATORS = /[\s-]+/g;

const EDGE_HYPHENS = /^-+|-+$/g;

function slugify(title) {
  if (typeof title !== 'string') {
    throw new TypeError('slugify expects a string');
  }

  return title
    .toLowerCase()
    .trim()
    .replace(DISALLOWED, '')
    .replace(SEPARATORS, '-')
    .replace(EDGE_HYPHENS, '');
}

module.exports = { slugify };
