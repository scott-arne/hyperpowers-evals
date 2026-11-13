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

test('does not end a sentence at the period inside a decimal number', () => {
  assert.equal(sentenceCount('It cost 3.14 dollars'), 1);
  assert.equal(sentenceCount('Pi is 3.14. Done.'), 2);
});

test('does not end a sentence at a period inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com today'), 1);
  assert.equal(sentenceCount('Visit example.com. Then leave.'), 2);
});

test('does not end a sentence at the periods in a.b.c', () => {
  assert.equal(sentenceCount('See a.b.c now'), 1);
});

test('does not end a sentence after any listed abbreviation', () => {
  const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e'];
  for (const abbr of abbreviations) {
    assert.equal(sentenceCount(`Hello ${abbr}. Smith left`), 1, abbr);
  }
});

test('matches abbreviations without regard to case', () => {
  assert.equal(sentenceCount('Hello MR. Smith left'), 1);
  assert.equal(sentenceCount('Hello dR. Smith left'), 1);
  assert.equal(sentenceCount('Use fruit E.G. apples'), 1);
});

test('matches an abbreviation after an opening quote or bracket', () => {
  assert.equal(sentenceCount('He met "Dr. Smith" today'), 1);
  assert.equal(sentenceCount('He met (Mr. Smith) today'), 1);
  assert.equal(sentenceCount('He met “Mrs. Smith” today'), 1);
});

test('ends a sentence at an ellipsis after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Dr... Smith left'), 2);
});

test('ends a sentence at a mixed terminator run after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Dr?! Smith left'), 2);
});

test('treats a closing quote after a terminator as part of the terminator', () => {
  assert.equal(sentenceCount('He said "stop." Then left.'), 2);
  assert.equal(sentenceCount('He asked "why?" Then left.'), 2);
});

test('treats a closing bracket after a terminator as part of the terminator', () => {
  assert.equal(sentenceCount('(He left.) Then he came back.'), 2);
  assert.equal(sentenceCount('He left [quietly!] Then returned.'), 2);
});

test('does not split when a terminator run is followed by a non-space', () => {
  assert.equal(sentenceCount('a.b'), 1);
  assert.equal(sentenceCount('Wait...what'), 1);
  assert.equal(sentenceCount('Hi!!there'), 1);
});
