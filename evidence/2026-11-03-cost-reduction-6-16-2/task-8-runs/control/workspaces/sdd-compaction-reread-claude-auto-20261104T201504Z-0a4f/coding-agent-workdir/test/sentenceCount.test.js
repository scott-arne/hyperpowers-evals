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

// Hand-worked rows for the Behaviour bullets the reference table does not reach.
const EXTRA_CASES = [
  // "?!" and "..." are each one terminator
  ['Really?! Yes.', 2],
  ['Wait... what', 2],
  ['Wait... what.', 2],
  // closing quotes and brackets after a terminator
  ['He said "stop." Then left.', 2],
  ['She left (quietly.) Then he came.', 2],
  ['Is it true?" He asked.', 2],
  // periods inside tokens are not terminators
  ['Pi is 3.14 today', 1],
  ['Pi is 3.14. Done.', 2],
  ['Visit example.com now', 1],
  ['See a.b.c now', 1],
  // abbreviations, case-insensitively
  ['Mr. Smith left.', 1],
  ['MR. Smith left.', 1],
  ['Hello Dr. Who', 1],
  ['Use fruit, e.g. apples', 1],
  ['That is i.e. fine', 1],
  ['That is I.E. fine', 1],
  ['Cats vs. dogs', 1],
  ['Cats VS. dogs', 1],
  // a non-abbreviation word still ends a sentence
  ['See Bob. Smith left.', 2],
  // runs and other marks after an abbreviation still end a sentence
  ['Ask Dr... Then go.', 2],
  ['Ask Dr?! Then go.', 2],
  ['Ask Dr! Then go.', 2],
  // text after the last terminator
  ['One. Two. Three', 3],
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

test('matches every hand-worked row for terminators, quotes, dotted tokens and abbreviations', () => {
  for (const [text, expected] of EXTRA_CASES) {
    assert.equal(sentenceCount(text), expected, JSON.stringify(text));
  }
});

test('does not end a sentence after any listed abbreviation in any case', () => {
  const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e'];
  for (const abbr of abbreviations) {
    for (const variant of [abbr, abbr.toLowerCase(), abbr.toUpperCase()]) {
      const text = `See ${variant}. Smith today`;
      assert.equal(sentenceCount(text), 1, JSON.stringify(text));
    }
  }
});
