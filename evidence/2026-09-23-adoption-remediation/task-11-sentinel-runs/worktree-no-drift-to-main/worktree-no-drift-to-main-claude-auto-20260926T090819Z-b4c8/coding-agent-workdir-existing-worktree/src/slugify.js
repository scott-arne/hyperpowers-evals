/**
 * Convert a title into a URL-safe slug.
 *
 * @param {string} title - The title to convert.
 * @returns {string} The lowercase, dash-separated slug.
 * @throws {TypeError} If `title` is not a string.
 */
function slugify(title) {
  if (typeof title !== 'string') {
    throw new TypeError('slugify expects a string');
  }

  // NFD splits accented characters into a base letter plus a combining mark,
  // so dropping the marks folds them to ASCII instead of discarding the letter.
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
