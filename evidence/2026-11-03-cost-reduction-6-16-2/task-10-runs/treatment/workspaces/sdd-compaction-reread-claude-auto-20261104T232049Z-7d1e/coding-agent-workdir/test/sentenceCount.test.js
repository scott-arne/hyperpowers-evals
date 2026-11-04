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

test('does not end a sentence after any listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    const text = `Ask ${abbr}. Smith about it.`;
    assert.equal(sentenceCount(text), 1, JSON.stringify(text));
  }
});

test('matches abbreviations without regard to case', () => {
  for (const text of ['MR. Smith left.', 'mrs. Smith left.', 'PROF. Smith left.', 'E.G. Smith left.', 'I.E. Smith left.']) {
    assert.equal(sentenceCount(text), 1, JSON.stringify(text));
  }
});

test('treats e.g. and i.e. inside a sentence as non-terminators', () => {
  assert.equal(sentenceCount('Bring fruit, e.g. apples. Bring bread, i.e. a loaf.'), 2);
});

test('ignores an opening quote or bracket before an abbreviation', () => {
  assert.equal(sentenceCount('Ask (Dr. Who) about it.'), 1);
  assert.equal(sentenceCount('He met "Mr. Smith" today.'), 1);
  assert.equal(sentenceCount('See “Prof. Lee” today.'), 1);
});

test('ends a sentence at a period after a word that is not a listed abbreviation', () => {
  assert.equal(sentenceCount('Mister. Smith left.'), 2);
});

test('counts an abbreviation at the very end of the text as part of one sentence', () => {
  assert.equal(sentenceCount('Hello Mr.'), 1);
});

test('does not split at the period of a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 exactly. It is irrational.'), 2);
});

test('does not split inside dotted names', () => {
  assert.equal(sentenceCount('Visit example.com today. Then leave.'), 2);
  assert.equal(sentenceCount('a.b.c'), 1);
  assert.equal(sentenceCount('Use a.b.c here'), 1);
});

test('ends a sentence after a dotted name that is followed by a period and space', () => {
  assert.equal(sentenceCount('Try a.b.c. Then stop.'), 2);
});

test('includes closing quotes after a terminator', () => {
  assert.equal(sentenceCount('He said "stop." Then left.'), 2);
  assert.equal(sentenceCount("He said 'stop.' Then left."), 2);
  assert.equal(sentenceCount('He said “stop.” Then left.'), 2);
  assert.equal(sentenceCount('He said ‘stop.’ Then left.'), 2);
});

test('includes closing brackets after a terminator', () => {
  assert.equal(sentenceCount('(See below.) Next.'), 2);
  assert.equal(sentenceCount('[See below.] Next.'), 2);
  assert.equal(sentenceCount('Is it so?) Yes.'), 2);
});

test('does not split when a closing quote is followed by more text without a space', () => {
  assert.equal(sentenceCount('He said "stop."Then left.'), 1);
});

test('ends a sentence at an ellipsis', () => {
  assert.equal(sentenceCount('Wait... What happened'), 2);
  assert.equal(sentenceCount('Well...'), 1);
});

test('ends a sentence at a mixed ?! run', () => {
  assert.equal(sentenceCount('Really?! Yes.'), 2);
});

test('ends a sentence at a run even directly after an abbreviation', () => {
  assert.equal(sentenceCount('Mr... Smith'), 2);
  assert.equal(sentenceCount('Mr?! Smith'), 2);
  assert.equal(sentenceCount('Dr.. Who'), 2);
});
