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

test('counts the hand-counted passage as eight sentences', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence after any listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs']) {
    assert.equal(sentenceCount(`We met ${abbr}. Smith today.`), 1, abbr);
  }
});

test('does not end a sentence after e.g. or i.e.', () => {
  assert.equal(sentenceCount('Take fruit, e.g. apples, today.'), 1);
  assert.equal(sentenceCount('Take fruit, i.e. apples, today.'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('We met MR. Smith today.'), 1);
  assert.equal(sentenceCount('We met dR. Smith today.'), 1);
  assert.equal(sentenceCount('Take fruit, E.G. apples, today.'), 1);
  assert.equal(sentenceCount('Take fruit, I.E. apples, today.'), 1);
});

test('recognises an abbreviation after an opening quote or bracket', () => {
  assert.equal(sentenceCount('"Mr. Smith left today.'), 1);
  assert.equal(sentenceCount('(Dr. Who is here today.'), 1);
  assert.equal(sentenceCount('[Prof. Plum is here today.'), 1);
});

test('ends a sentence at a run of periods after an abbreviation', () => {
  assert.equal(sentenceCount('We met Mr... Then we left.'), 2);
});

test('ends a sentence at a question-exclamation run after an abbreviation', () => {
  assert.equal(sentenceCount('Did we meet Dr?! Then we left.'), 2);
});

test('does not break a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 today.'), 1);
});

test('does not break a domain name', () => {
  assert.equal(sentenceCount('Visit example.com now.'), 1);
});

test('does not break a dotted run of letters', () => {
  assert.equal(sentenceCount('See a.b.c now.'), 1);
});

test('absorbs closing quotes after a terminator', () => {
  assert.equal(sentenceCount('He said "Go." Then he left.'), 2);
  assert.equal(sentenceCount('Really?" she asked.'), 2);
});

test('absorbs closing brackets after a terminator', () => {
  assert.equal(sentenceCount('(He left.) Then he came back.'), 2);
  assert.equal(sentenceCount('[He left.] Then he came back.'), 2);
});
