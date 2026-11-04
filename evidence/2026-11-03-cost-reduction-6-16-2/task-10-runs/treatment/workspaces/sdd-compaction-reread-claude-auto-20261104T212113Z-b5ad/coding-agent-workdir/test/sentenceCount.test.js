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

test('counts the eight sentences of the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith left.'), 1);
  assert.equal(sentenceCount('Dr. and Mrs. Jones met Prof. Lee.'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith left.'), 1);
});

test('does not end a sentence at e.g. or i.e.', () => {
  assert.equal(sentenceCount('Use fruit, e.g. apples. Done.'), 2);
  assert.equal(sentenceCount('Use fruit, i.e. apples. Done.'), 2);
});

test('ignores an opening bracket before an abbreviation', () => {
  assert.equal(sentenceCount('He met (Dr. Wren) today.'), 1);
});

test('ends a sentence at a period after a word that is not a listed abbreviation', () => {
  assert.equal(sentenceCount('Apples etc. Pears'), 2);
});

test('ends a sentence at a run of periods even after an abbreviation', () => {
  assert.equal(sentenceCount('Wait Mr... Next'), 2);
});

test('does not end a sentence inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 today.'), 1);
});

test('does not end a sentence inside a dotted name', () => {
  assert.equal(sentenceCount('Visit example.com now. Then go'), 2);
  assert.equal(sentenceCount('See a.b.c now'), 1);
});

test('treats a mixed run of terminators as one terminator', () => {
  assert.equal(sentenceCount('Really?! Yes... Fine.'), 3);
});

test('lets closing quotes and brackets follow a terminator', () => {
  assert.equal(sentenceCount('"Stop." He ran.'), 2);
  assert.equal(sentenceCount('(He left.) She stayed.'), 2);
});
