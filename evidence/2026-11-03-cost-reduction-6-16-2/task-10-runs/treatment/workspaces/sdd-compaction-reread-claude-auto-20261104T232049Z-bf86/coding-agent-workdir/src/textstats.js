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

// Words whose trailing period does not end a sentence. Compared lower-case and
// without any opening bracket or quote. "U.S.A." style initialisms are not
// listed: they usually do end a sentence when they come last, and guessing
// otherwise would trade one error for another.
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'sr', 'jr', 'vs', 'e.g', 'i.e']);

// A terminator run (“.” “?!” “...”) plus any closing quotes or brackets, and
// only where whitespace or the end of the text follows. Requiring that keeps
// decimals (“3.14”), domains (“example.com”) and “a.b.c” in one piece.
const TERMINATOR_PATTERN = /([.!?]+)(["\u201d'\u2019)\]]*)(?=\s|$)/g;

function endsWithAbbreviation(before) {
  const last = before.match(/(\S+)$/);
  if (last === null) {
    return false;
  }
  const word = last[1].replace(/^["\u201c'\u2018([\[]+/, '').toLowerCase();
  return ABBREVIATIONS.has(word);
}

/**
 * Count the sentences in a piece of text.
 *
 * A sentence is a stretch of text containing at least one word and ending at a
 * terminator run, or at the end of the text. A lone period after a known
 * abbreviation does not end a sentence.
 *
 * @param {string} text
 * @returns {number}
 */
function sentenceCount(text) {
  assertText('sentenceCount', text);
  let count = 0;
  let start = 0;
  for (const match of text.matchAll(TERMINATOR_PATTERN)) {
    const before = text.slice(start, match.index);
    if (match[1] === '.' && endsWithAbbreviation(before)) {
      continue;
    }
    if (tokenize(before).length > 0) {
      count += 1;
    }
    start = match.index + match[0].length;
  }
  if (tokenize(text.slice(start)).length > 0) {
    count += 1;
  }
  return count;
}

module.exports = { wordCount, sentenceCount };
