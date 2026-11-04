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

// A terminator run ("." "?!" "...") plus any closing quotes or brackets, and
// only where whitespace or the end of the text follows. Requiring that keeps
// decimals ("3.14"), domains ("example.com") and "a.b.c" in one piece.
const TERMINATOR_PATTERN = /([.!?]+)(["'”’)\]]*)(?=\s|$)/g;

function endsWithAbbreviation(before) {
  const last = before.match(/(\S+)$/);
  if (last === null) {
    return false;
  }
  const word = last[1].replace(/^["'“‘(\[]+/, '').toLowerCase();
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

// Function words that would otherwise crowd every ranking. The list is
// deliberately short and fixed: callers who need a different list can filter
// the full ranking (pass a large n) themselves.
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'had', 'has',
  'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
  'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were',
  'will', 'with',
]);

/**
 * List the most frequent words in a piece of text.
 *
 * Words are lower-cased, typographic apostrophes are folded to straight ones,
 * and stop words are skipped. Entries are ordered by count (highest first),
 * then alphabetically, so the result is deterministic.
 *
 * @param {string} text
 * @param {number} n How many entries to return; a non-negative integer.
 * @returns {Array<{word: string, count: number}>}
 */
function topWords(text, n) {
  assertText('topWords', text);
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`topWords: n must be a non-negative integer, received ${String(n)}`);
  }
  const counts = new Map();
  for (const token of tokenize(text)) {
    const word = token.toLowerCase().replace(/’/g, "'");
    if (STOP_WORDS.has(word)) {
      continue;
    }
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))
    .slice(0, n);
}

const DEFAULT_WORDS_PER_MINUTE = 200;

/**
 * Estimate how many whole minutes a text takes to read.
 *
 * The estimate is the word count divided by the reading rate, rounded up, so
 * any text with at least one word takes at least a minute and the empty text
 * takes none.
 *
 * @param {string} text
 * @param {number} [wpm=200] Reading rate in words per minute; a positive, finite number.
 * @returns {number} Whole minutes.
 */
function readingTimeMinutes(text, wpm = DEFAULT_WORDS_PER_MINUTE) {
  assertText('readingTimeMinutes', text);
  if (typeof wpm !== 'number' || !Number.isFinite(wpm) || wpm <= 0) {
    throw new RangeError(`readingTimeMinutes: wpm must be a positive finite number, received ${String(wpm)}`);
  }
  return Math.ceil(wordCount(text) / wpm);
}

module.exports = { wordCount, sentenceCount, topWords, readingTimeMinutes };
