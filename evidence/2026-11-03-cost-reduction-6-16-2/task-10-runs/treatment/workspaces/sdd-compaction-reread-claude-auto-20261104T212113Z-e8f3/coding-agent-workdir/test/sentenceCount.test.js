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

test('counts the hand-counted eight sentences in the passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a listed abbreviation, ignoring case', () => {
  const rows = [
    ['Mr. Smith left', 1],
    ['MR. Smith left', 1],
    ['mrs. Smith left', 1],
    ['Dr. and Prof. Lee met', 1],
    ['Ms. Lee and St. Paul and Sr. Cruz and Jr. Cruz', 1],
    ['Smith vs. Jones', 1],
    ['Smith VS. Jones', 1],
    ['Use fruit, e.g. apples', 1],
    ['Use fruit, E.G. apples', 1],
    ['Use fruit, i.e. apples', 1],
    ['Use fruit, I.E. apples', 1],
    ['Mr. Smith left. Dr. Who stayed.', 2],
  ];
  for (const [text, expected] of rows) {
    assert.equal(sentenceCount(text), expected, JSON.stringify(text));
  }
});

test('ends a sentence at a run of terminators after an abbreviation', () => {
  assert.equal(sentenceCount('Mr... Smith left'), 2);
  assert.equal(sentenceCount('Mr?! Smith left'), 2);
  assert.equal(sentenceCount('Mr. Smith left'), 1);
});

test('does not end a sentence inside decimals, domain names or dotted runs', () => {
  assert.equal(sentenceCount('Pi is 3.14 exactly'), 1);
  assert.equal(sentenceCount('Visit example.com today'), 1);
  assert.equal(sentenceCount('a.b.c'), 1);
  assert.equal(sentenceCount('Pi is 3.14. Visit example.com. Try a.b.c'), 3);
});

test('ends a sentence at a terminator followed by closing quotes or brackets', () => {
  assert.equal(sentenceCount('He said "stop." Then left'), 2);
  assert.equal(sentenceCount('(He left.) She stayed'), 2);
  assert.equal(sentenceCount('He left.” She stayed'), 2);
  assert.equal(sentenceCount('Is it so?\' She said'), 2);
});
