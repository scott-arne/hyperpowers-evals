const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sentenceCount } = require('../src/textstats');

const CASES = [
  ["", 0],
  [" ", 0],
  [".", 0],
  ["a", 1],
  ["a.", 1],
  ["a. b.", 2],
  ["a! b? c.", 3],
  ["a!? b", 2],
];

test('returns 0 for the empty string', () => {
  assert.equal(sentenceCount(''), 0);
});

test('returns 0 for whitespace only', () => {
  assert.equal(sentenceCount('  \n\t  '), 0);
});

test('returns 0 for terminators with no words', () => {
  assert.equal(sentenceCount('... ?! . ! ?'), 0);
});

test('counts one sentence with a final period', () => {
  assert.equal(sentenceCount('The tide came in.'), 1);
});

test('counts one sentence with no terminator at all', () => {
  assert.equal(sentenceCount('The tide came in'), 1);
});

test('counts a trailing fragment after the last terminator', () => {
  assert.equal(sentenceCount('The tide came in. Then it left'), 2);
});

test('throws a TypeError naming the function for a non-string', () => {
  for (const bad of [undefined, null, 7, {}, ['One.']]) {
    assert.throws(() => sentenceCount(bad), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('sentenceCount:'));
      return true;
    });
  }
});

test('handles typographic and straight quotes in sentence boundaries', () => {
  // Typographic (curly) double quotes
  assert.equal(sentenceCount('He said “Go.” Then left.'), 2);
  // Straight single quotes
  assert.equal(sentenceCount('It was \'ok.\' Then left.'), 2);
  // Straight double quotes
  assert.equal(sentenceCount('He said "Go." Then left.'), 2);
});

test('does not end a sentence at a period after a known abbreviation', () => {
  assert.equal(sentenceCount('Mr. Alder came. He left.'), 2);
});

test('does not end a sentence at a period inside a decimal or domain name', () => {
  assert.equal(sentenceCount('It rose 3.5 percent at example.com today.'), 1);
});

test('matches every row of the reference table', () => {
  for (const [text, expected] of CASES) {
    assert.equal(sentenceCount(text), expected, JSON.stringify(text));
  }
});
