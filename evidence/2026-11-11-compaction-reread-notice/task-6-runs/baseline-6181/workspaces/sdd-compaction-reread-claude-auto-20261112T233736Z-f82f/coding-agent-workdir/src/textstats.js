// A word is a run of letters or digits (any script), optionally joined to the
// next run by a single apostrophe (straight or typographic) or hyphen. The
// joiners are only part of a word when letters or digits sit on both sides, so
// a trailing "well-" or "dogs'" loses its joiner. Everything else, including
// em dashes, periods and underscores, separates words.
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

function assertText(fn, value) {
  if (typeof value !== 'string') {
    throw new TypeError(`${fn}: text must be a string, received ${value === null ? 'null' : typeof value}`);
  }
}

// Private: the single definition of "word" shared by every statistic below.
function tokenize(text) {
  return text.match(WORD_PATTERN) ?? [];
}

/**
 * Count the words in a piece of text.
 *
 * @param {string} text
 * @returns {number}
 */
function wordCount(text) {
  assertText('wordCount', text);
  return tokenize(text).length;
}

module.exports = { wordCount };
