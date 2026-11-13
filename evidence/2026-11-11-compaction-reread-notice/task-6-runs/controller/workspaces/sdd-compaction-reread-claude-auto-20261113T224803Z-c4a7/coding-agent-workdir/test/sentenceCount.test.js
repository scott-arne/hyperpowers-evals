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

const ABBREVIATIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e'];

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

test('counts the hand-counted passage as eight sentences', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a lone period after a listed abbreviation', () => {
  for (const abbr of ABBREVIATIONS) {
    assert.equal(sentenceCount(`Ask ${abbr}. Smith today.`), 1, abbr);
  }
});

test('compares abbreviations without regard to case', () => {
  for (const abbr of ABBREVIATIONS) {
    assert.equal(sentenceCount(`Ask ${abbr.toUpperCase()}. Smith today.`), 1, abbr.toUpperCase());
    assert.equal(sentenceCount(`Ask ${abbr.toLowerCase()}. Smith today.`), 1, abbr.toLowerCase());
  }
});

test('ignores an opening bracket before an abbreviation', () => {
  assert.equal(sentenceCount('Pick one (e.g. apples) today.'), 1);
  assert.equal(sentenceCount('Pick one (i.e. apples) today.'), 1);
  assert.equal(sentenceCount('Ask (Dr. Wren) today.'), 1);
});

test('ignores an opening quote before an abbreviation', () => {
  assert.equal(sentenceCount('He said "Dr. Wren" today.'), 1);
  assert.equal(sentenceCount("He said 'Mr. Alder' today."), 1);
});

test('still ends a sentence at an ellipsis after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Mr... Smith left.'), 2);
  assert.equal(sentenceCount('Ask Dr... Wren left.'), 2);
});

test('still ends a sentence at "?!" after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Mr?! Smith left.'), 2);
  assert.equal(sentenceCount('Ask Dr?! Wren left.'), 2);
});

test('ends a sentence at a period after a word that is not an abbreviation', () => {
  assert.equal(sentenceCount('Ask Bob. Smith left.'), 2);
});

test('does not split a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 exactly.'), 1);
});

test('does not split a dotted name', () => {
  assert.equal(sentenceCount('Visit example.com today.'), 1);
});

test('does not split a dotted sequence of letters', () => {
  assert.equal(sentenceCount('See a.b.c for details.'), 1);
});

test('ends a sentence at a terminator followed by a closing quote', () => {
  assert.equal(sentenceCount('"Is it?" she said.'), 2);
});

test('ends a sentence at a terminator followed by a closing bracket', () => {
  assert.equal(sentenceCount('(Done.) Next.'), 2);
});

test('counts an ellipsis as a single terminator', () => {
  assert.equal(sentenceCount('Wait... what'), 2);
  assert.equal(sentenceCount('Wait...'), 1);
});

test('counts "?!" as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes.'), 2);
  assert.equal(sentenceCount('Really?!'), 1);
});
