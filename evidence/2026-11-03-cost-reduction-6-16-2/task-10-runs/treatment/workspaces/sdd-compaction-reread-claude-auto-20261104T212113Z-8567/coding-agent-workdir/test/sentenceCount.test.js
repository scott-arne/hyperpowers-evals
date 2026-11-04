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

test('counts the eight hand-counted sentences of the passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at an abbreviation period', () => {
  for (const text of [
    'Mr. Alder left.',
    'Mrs. Alder left.',
    'Ms. Alder left.',
    'Dr. Wren left.',
    'Prof. Wren left.',
    'St. Ives is a town.',
    'Sr. Wren left.',
    'Jr. Wren left.',
    'Cats vs. dogs is old.',
    'Use fruit, e.g. apples.',
    'Use fruit, i.e. apples.',
  ]) {
    assert.equal(sentenceCount(text), 1, text);
  }
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Alder and dr. Wren left.'), 1);
});

test('ignores an opening quote or bracket before an abbreviation', () => {
  assert.equal(sentenceCount('He met (Dr. Wren) and "Mr. Alder" today.'), 1);
});

test('ends a sentence at a run of periods even after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Dr... Wren came'), 2);
});

test('ends a sentence at a non-period terminator after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Dr! Wren came'), 2);
});

test('treats a run of terminators as one terminator', () => {
  assert.equal(sentenceCount('Really?! Yes... Fine.'), 3);
});

test('does not split inside decimals', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly.'), 1);
});

test('does not split inside domain names or dotted names', () => {
  assert.equal(sentenceCount('Visit example.com or a.b.c today.'), 1);
});

test('ends a sentence at a terminator followed by closing quotes or brackets', () => {
  assert.equal(sentenceCount('"Go now." Then (stay!) Or "wait?" Done'), 4);
});

test('treats a terminator followed by a newline as a sentence end', () => {
  assert.equal(sentenceCount('One.\nTwo.'), 2);
});
