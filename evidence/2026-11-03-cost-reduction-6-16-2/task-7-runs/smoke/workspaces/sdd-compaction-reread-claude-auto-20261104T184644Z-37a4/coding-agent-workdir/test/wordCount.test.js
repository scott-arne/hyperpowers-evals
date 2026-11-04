const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wordCount } = require('../src/textstats');

// A passage whose word count was established independently with `wc -w`:
// it has no standalone punctuation and no hyphenated or apostrophe words, so
// whitespace-separated tokens and words coincide.
const PASSAGE = [
  'The lighthouse keeper climbed the spiral stairs every evening, counting',
  'each step as his father had taught him. There were one hundred and twelve,',
  'and on stormy nights the number never seemed to change, though his legs',
  'insisted otherwise. At the top he trimmed the wick, polished the great lens,',
  'and watched the beam sweep across the water toward ships he would never meet.',
].join('\n');

// Reference table: every row below also appears in the plan's reference section.
const CASES = [
  ["", 0],
  [" ", 0],
  ["a", 1],
  ["A", 1],
  ["I", 1],
  ["a b", 2],
  ["a  b", 2],
  ["a\tb", 2],
  ["a\nb", 2],
  ["a\r\nb", 2],
  ["a, b", 2],
  ["a. b", 2],
  ["a; b", 2],
  ["(a)", 1],
  ["[a] {b}", 2],
  ["\"quoted\"", 1],
  ["'single'", 1],
  ["it's", 1],
  ["its'", 1],
  ["'tis", 1],
  ["rock 'n' roll", 3],
  ["state-of-the-art", 1],
  ["state of the art", 4],
  ["mother-in-law's", 1],
  ["-leading", 1],
  ["trailing-", 1],
  ["a--b", 2],
  ["a - b", 2],
  ["a – b", 2],
  ["a — b", 2],
  ["a…b", 2],
  ["a_b", 2],
  ["snake_case_name", 3],
  ["camelCaseName", 1],
  ["x1", 1],
  ["1x", 1],
  ["007", 1],
  ["1,000", 2],
  ["1 000", 2],
  ["$5", 1],
  ["5%", 1],
  ["50/50", 2],
  ["and/or", 2],
  ["a/b/c", 3],
  ["user@example.com", 3],
  ["https://example.com/a", 4],
  ["#hashtag", 1],
  ["@mention", 1],
  ["C++", 1],
  ["C#", 1],
  ["e-mail", 1],
  ["co-operate", 1],
  ["re-enter", 1],
  ["don’t", 1],
  ["O'Brien", 1],
  ["O’Brien", 1],
  ["D'Artagnan's", 1],
  ["Ünïcödé", 1],
  ["日本語", 1],
  ["日本語 テキスト", 2],
  ["Привет мир", 2],
  ["שלום עולם", 2],
  ["مرحبا بالعالم", 2],
  ["ÀÉÎÕÜ", 1],
  ["ß", 1],
  ["one two three four five six seven eight nine ten", 10],
  ["ONE TWO THREE", 3],
  ["one.two.three", 3],
  ["one,two,three", 3],
  ["one;two;three", 3],
  ["one:two", 2],
  ["one!two", 2],
  ["one?two", 2],
  ["   padded   ", 1],
  ["\n\nlines\n\n", 1],
  ["\t", 0],
  ["...", 0],
  ["---", 0],
  ["***", 0],
  ["???", 0],
  ["'", 0],
  ["'a'", 1],
  ["a''b", 2],
  ["a--b--c", 3],
];

test('returns 0 for the empty string', () => {
  assert.equal(wordCount(''), 0);
});

test('returns 0 for a string of only whitespace', () => {
  assert.equal(wordCount('   \t\n  \r\n '), 0);
});

test('returns 1 for a single word', () => {
  assert.equal(wordCount('hello'), 1);
});

test('counts words separated by single spaces', () => {
  assert.equal(wordCount('the quick brown fox'), 4);
});

test('ignores leading, trailing and repeated whitespace', () => {
  assert.equal(wordCount('   the   quick \t brown\n\nfox   '), 4);
});

test('treats newlines and tabs as separators', () => {
  assert.equal(wordCount('one\ntwo\tthree\r\nfour'), 4);
});

test('does not count punctuation attached to a word as a separate word', () => {
  assert.equal(wordCount('Well, well; well: well! well? well.'), 6);
});

test('does not count standalone punctuation as words', () => {
  assert.equal(wordCount('- - - ... ?! ,'), 0);
});

test('counts a contraction as one word', () => {
  assert.equal(wordCount("I don't think they'll mind"), 5);
});

test('counts a word with a typographic apostrophe as one word', () => {
  assert.equal(wordCount('It’s the keeper’s lamp'), 4);
});

test('counts a hyphenated compound as one word', () => {
  assert.equal(wordCount('a well-known, long-standing rule'), 4);
});

test('splits on an em dash with no surrounding spaces', () => {
  assert.equal(wordCount('one—two—three'), 3);
});

test('counts digit sequences as words', () => {
  assert.equal(wordCount('Room 101 holds 3 chairs and 12 tables'), 8);
});

test('splits a decimal number at the point', () => {
  assert.equal(wordCount('pi is about 3.14 today'), 6);
});

test('splits a domain name at the dot', () => {
  assert.equal(wordCount('visit example.com now'), 4);
});

test('counts letters with diacritics and non-Latin letters', () => {
  assert.equal(wordCount('naïve café über буква 東京'), 5);
});

test('counts a multi-line passage', () => {
  assert.equal(wordCount(PASSAGE), 64);
});

test('is not fooled by a trailing hyphen or apostrophe', () => {
  assert.equal(wordCount("well- and dogs' bones"), 4);
});

test('gives the same answer when called twice', () => {
  assert.equal(wordCount(PASSAGE), wordCount(PASSAGE));
});

test('throws a TypeError naming the function for a non-string', () => {
  for (const bad of [undefined, null, 42, {}, [], ['a b']]) {
    assert.throws(() => wordCount(bad), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('wordCount:'));
      return true;
    });
  }
});

test('matches every row of the reference table', () => {
  for (const [text, expected] of CASES) {
    assert.equal(wordCount(text), expected, JSON.stringify(text));
  }
});
