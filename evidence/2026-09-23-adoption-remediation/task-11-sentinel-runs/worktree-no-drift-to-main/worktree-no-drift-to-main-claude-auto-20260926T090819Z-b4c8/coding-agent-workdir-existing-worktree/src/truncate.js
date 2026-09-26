const ELLIPSIS = '…';

/**
 * Shorten `text` so the result is never longer than `n` characters.
 *
 * The ellipsis is charged against the budget rather than appended to it, so
 * the return value fits a hard width limit (table cells, fixed-width logs)
 * without the caller reserving space for it.
 *
 * @param {string} text - The string to shorten.
 * @param {number} n - Maximum length of the result, in characters.
 * @returns {string} `text` unchanged when it already fits, otherwise a
 *   truncation of exactly `n` characters ending in a single-character
 *   ellipsis.
 * @throws {TypeError} If `text` is not a string or `n` is not an integer.
 */
function truncate(text, n) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }
  if (!Number.isInteger(n)) {
    throw new TypeError('n must be an integer');
  }
  if (n <= 0) {
    return '';
  }
  if (text.length <= n) {
    return text;
  }
  return text.slice(0, n - 1) + ELLIPSIS;
}

module.exports = { truncate };
