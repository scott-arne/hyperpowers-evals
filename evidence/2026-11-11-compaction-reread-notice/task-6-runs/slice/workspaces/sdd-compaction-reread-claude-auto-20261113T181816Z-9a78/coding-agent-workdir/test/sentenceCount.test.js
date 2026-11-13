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

test('does not end a sentence after a listed title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith met Mrs. Jones and Ms. Lee.'), 1);
  assert.equal(sentenceCount('Prof. Ng and Dr. Who met St. Paul, Sr. and Jr. there.'), 1);
});

test('does not end a sentence after vs, e.g or i.e', () => {
  assert.equal(sentenceCount('Cats vs. dogs is old.'), 1);
  assert.equal(sentenceCount('Pick one, e.g. a cat.'), 1);
  assert.equal(sentenceCount('Pick one, i.e. a cat.'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('DR. Who and mR. Smith left.'), 1);
  assert.equal(sentenceCount('Pick one, E.G. a cat, I.E. a pet.'), 1);
});

test('ignores an opening quote or bracket before an abbreviation', () => {
  assert.equal(sentenceCount('He said "Dr. Wren is here" today.'), 1);
  assert.equal(sentenceCount('She met (Mr. Alder) today.'), 1);
  assert.equal(sentenceCount('See [e.g. this] now.'), 1);
});

test('ends a sentence at an ellipsis after an abbreviation-like word', () => {
  assert.equal(sentenceCount('Ask Dr... Then go'), 2);
});

test('ends a sentence at an interrobang after an abbreviation-like word', () => {
  assert.equal(sentenceCount('Ask Dr?! Then go'), 2);
});

test('ends a sentence at a period after an unlisted word', () => {
  assert.equal(sentenceCount('It is Mon. Then it is Tue.'), 2);
});

test('does not break inside decimals or dotted names', () => {
  assert.equal(sentenceCount('Pi is 3.14 today'), 1);
  assert.equal(sentenceCount('Visit example.com now'), 1);
  assert.equal(sentenceCount('The id is a.b.c here'), 1);
});

test('includes closing quotes and brackets in the terminator', () => {
  assert.equal(sentenceCount('He said "Go." Then left.'), 2);
  assert.equal(sentenceCount('He left (quickly.) Then she came.'), 2);
  assert.equal(sentenceCount('He asked [why?] Then left'), 2);
  assert.equal(sentenceCount('She said “go.” Then left'), 2);
});

test('returns equal results when called twice with the same text', () => {
  assert.equal(sentenceCount(PASSAGE), sentenceCount(PASSAGE));
  assert.equal(sentenceCount('a. b. c'), sentenceCount('a. b. c'));
});
