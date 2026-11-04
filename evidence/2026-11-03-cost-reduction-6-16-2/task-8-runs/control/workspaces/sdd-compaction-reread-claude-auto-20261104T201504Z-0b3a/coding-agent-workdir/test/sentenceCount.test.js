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

test('counts the sentences in a multi-line passage', () => {
  // Counted by hand, sentence by sentence: 8.
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a listed abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith met Mrs. Jones.'), 1);
  assert.equal(sentenceCount('Dr. Ng and Prof. Lee saw St. Paul.'), 1);
  assert.equal(sentenceCount('Ms. Ray, Sr. and Jr. argued about cats vs. dogs.'), 1);
  assert.equal(sentenceCount('Bring fruit, e.g. apples. Then rest, i.e. sleep.'), 2);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith left. dr. Jones stayed.'), 2);
});

test('ends a sentence at an abbreviation followed by a run of terminators', () => {
  assert.equal(sentenceCount('Ask Mr... Then go'), 2);
  assert.equal(sentenceCount('Is it Dr?! Yes.'), 2);
});

test('does not end a sentence inside decimals or dotted names', () => {
  assert.equal(sentenceCount('Pi is 3.14 today. See example.com now.'), 2);
  assert.equal(sentenceCount('a.b.c'), 1);
});

test('treats a run of terminators as a single terminator', () => {
  assert.equal(sentenceCount('Wait... what?! Fine.'), 3);
});

test('keeps closing quotes and brackets with their terminator', () => {
  assert.equal(sentenceCount('"Go home." Then stay.'), 2);
  assert.equal(sentenceCount('She asked "why?" He left'), 2);
  assert.equal(sentenceCount('He said (stop.) Then left.'), 2);
  assert.equal(sentenceCount('It was [done!] Next.'), 2);
  assert.equal(sentenceCount('“Go home.” Then stay.'), 2);
});

test('does not count a lone closing quote as a sentence', () => {
  assert.equal(sentenceCount('He left." '), 1);
});
