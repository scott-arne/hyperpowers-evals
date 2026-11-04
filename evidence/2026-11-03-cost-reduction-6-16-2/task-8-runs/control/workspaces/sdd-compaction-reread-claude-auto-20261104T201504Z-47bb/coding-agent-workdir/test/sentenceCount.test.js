const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sentenceCount } = require('../src/textstats');

// Eight sentences, counted by hand: the question and the exclamation each end
// one, while the "Mr." and "Dr." titles and the decimal inside the fourth
// sentence must not.
const PASSAGE = [
  'Mr. Alder opened the shop at nine. Nobody came in until noon! When the first',
  'customer arrived, Dr. Wren asked whether the prices had changed. They had',
  'risen by 3.5 percent since spring. "Is that all?" she said. He nodded, and',
  'the afternoon went by quietly. By closing time the till held forty dollars.',
].join('\n');

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

test('matches every row of the reference table', () => {
  for (const [text, expected] of CASES) {
    assert.equal(sentenceCount(text), expected, JSON.stringify(text));
  }
});

test('counts the sentences in the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at an abbreviation followed by more text', () => {
  assert.equal(sentenceCount('Mr. Smith left. Dr. Jones stayed.'), 2);
  assert.equal(sentenceCount('Use a tool, e.g. a saw. Then stop, i.e. rest.'), 2);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith left. prof. Jones stayed.'), 2);
});

test('does not end a sentence at an abbreviation at the very end of the text', () => {
  assert.equal(sentenceCount('I met Mr.'), 1);
  assert.equal(sentenceCount('Hello there. I met Dr.'), 2);
});

test('treats a run of terminators after an abbreviation as a sentence end', () => {
  assert.equal(sentenceCount('Ask Mr... Smith'), 2);
});

test('does not split at decimals or dotted names', () => {
  assert.equal(sentenceCount('Pi is 3.14 today'), 1);
  assert.equal(sentenceCount('Visit example.com now.'), 1);
  assert.equal(sentenceCount('The id is a.b.c here'), 1);
});

test('treats a run of terminators as a single sentence end', () => {
  assert.equal(sentenceCount('Really?! Yes... Fine.'), 3);
  assert.equal(sentenceCount('Wait... what'), 2);
});

test('lets closing quotes and brackets follow a terminator', () => {
  assert.equal(sentenceCount('He said "stop." Then he left.'), 2);
  assert.equal(sentenceCount('(It ended.) Then it began.'), 2);
  assert.equal(sentenceCount('She asked “why?” He shrugged.'), 2);
});
