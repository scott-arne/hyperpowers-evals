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

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith met Dr. Jones. They talked.'), 2);
});

test('does not end a sentence at e.g. or i.e.', () => {
  assert.equal(sentenceCount('Bring snacks, e.g. fruit, i.e. something light.'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith left. DR. Jones stayed.'), 2);
});

test('does not end a sentence at an abbreviation after an opening quote', () => {
  assert.equal(sentenceCount('"Mr. Smith" left.'), 1);
});

test('does not end a sentence at an abbreviation after an opening bracket', () => {
  assert.equal(sentenceCount('(Dr. Who) left.'), 1);
});

test('ends a sentence at an ellipsis that follows an abbreviation', () => {
  assert.equal(sentenceCount('Ask Dr... Then go.'), 2);
});

test('ends a sentence at a question and exclamation run that follows an abbreviation', () => {
  assert.equal(sentenceCount('Is it Mr?! Yes.'), 2);
});

test('does not end a sentence inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 today.'), 1);
});

test('does not end a sentence inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com now.'), 1);
});

test('does not end a sentence inside a dotted name', () => {
  assert.equal(sentenceCount('The a.b.c module works.'), 1);
});

test('ends a sentence at a terminator followed by a closing quote', () => {
  assert.equal(sentenceCount('He said "Stop." Then he left.'), 2);
});

test('ends a sentence at a terminator followed by a closing bracket', () => {
  assert.equal(sentenceCount('(See above.) Next.'), 2);
});
