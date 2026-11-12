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

test('counts eight sentences in the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence after a listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    const text = `We asked ${abbr}. Smith about it`;
    assert.equal(sentenceCount(text), 1, JSON.stringify(text));
  }
});

test('matches abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith arrived'), 1);
  assert.equal(sentenceCount('Bring fruit, E.G. apples'), 1);
  assert.equal(sentenceCount('Bring fruit, e.G. apples'), 1);
});

test('matches an abbreviation preceded by an opening quote or bracket', () => {
  assert.equal(sentenceCount('He met ("Dr. Smith") today'), 1);
  assert.equal(sentenceCount('He met [Dr. Smith] today'), 1);
  assert.equal(sentenceCount('He met “Dr. Smith” today'), 1);
});

test('does not end a sentence at a period inside a decimal', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly'), 1);
});

test('does not end a sentence at a period inside a dotted name', () => {
  assert.equal(sentenceCount('Visit example.com today'), 1);
  assert.equal(sentenceCount('The a.b.c module loads'), 1);
});

test('ends a sentence when closing quotes or brackets follow the terminator', () => {
  assert.equal(sentenceCount('He said "Stop." Then left'), 2);
  assert.equal(sentenceCount('He left (quietly.) Then slept'), 2);
  assert.equal(sentenceCount('He said “Stop.” Then left'), 2);
  assert.equal(sentenceCount('He said ‘Stop.’ Then left'), 2);
});

test('counts a run of terminators as one terminator', () => {
  assert.equal(sentenceCount('Wait... Then left'), 2);
  assert.equal(sentenceCount('Really?! Then left'), 2);
});

test('ends a sentence at a terminator run right after an abbreviation', () => {
  assert.equal(sentenceCount('I met Dr... Then left'), 2);
  assert.equal(sentenceCount('I met Dr?! Then left'), 2);
});
