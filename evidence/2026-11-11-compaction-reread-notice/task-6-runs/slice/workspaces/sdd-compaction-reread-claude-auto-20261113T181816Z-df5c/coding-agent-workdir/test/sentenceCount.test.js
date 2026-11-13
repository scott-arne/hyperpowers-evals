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
  assert.equal(sentenceCount('Mr. Smith left. Dr. Jones stayed.'), 2);
  assert.equal(sentenceCount('See Prof. Lee, Mrs. Ray, Ms. Fox, St. Paul, Sr. Ann and Jr. Bob.'), 1);
});

test('does not end a sentence at vs., e.g. or i.e.', () => {
  assert.equal(sentenceCount('Cats vs. dogs is an old debate. Fine.'), 2);
  assert.equal(sentenceCount('Bring fruit, e.g. apples, or nuts, i.e. almonds.'), 1);
});

test('matches abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith left. DR. Jones stayed.'), 2);
  assert.equal(sentenceCount('Bring fruit, E.G. apples, or nuts, I.E. almonds.'), 1);
  assert.equal(sentenceCount('Cats VS. dogs.'), 1);
});

test('does not end a sentence at an abbreviation after an opening quote or bracket', () => {
  assert.equal(sentenceCount('("Dr. Wren left.") Then he came back.'), 2);
  assert.equal(sentenceCount('He said "Mr. Smith left." Then silence.'), 2);
});

test('does not end a sentence inside a decimal', () => {
  assert.equal(sentenceCount('Pi is about 3.14 and e is about 2.72'), 1);
});

test('does not end a sentence inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com for details'), 1);
  assert.equal(sentenceCount('Visit example.com now. Then leave.'), 2);
});

test('does not end a sentence inside a dotted run like a.b.c', () => {
  assert.equal(sentenceCount('a.b.c'), 1);
  assert.equal(sentenceCount('The id a.b.c is valid. Next.'), 2);
});

test('treats an ellipsis as a single terminator', () => {
  assert.equal(sentenceCount('Wait... what'), 2);
  assert.equal(sentenceCount('Wait... what...'), 2);
});

test('treats ?! as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes!'), 2);
});

test('ends a sentence at an ellipsis that follows an abbreviation', () => {
  assert.equal(sentenceCount('Mr... Smith left'), 2);
});

test('ends a sentence at a terminator followed by a closing quote', () => {
  assert.equal(sentenceCount('"Is that all?" she said.'), 2);
});

test('ends a sentence at a terminator followed by a closing bracket', () => {
  assert.equal(sentenceCount('(see above.) Next'), 2);
});
