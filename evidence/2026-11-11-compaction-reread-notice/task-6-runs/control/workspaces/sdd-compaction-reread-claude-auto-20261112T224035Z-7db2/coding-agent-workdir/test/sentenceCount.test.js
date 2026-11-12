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

test('does not end a sentence at the title Mr.', () => {
  assert.equal(sentenceCount('Mr. Alder left.'), 1);
});

test('does not end a sentence at the abbreviation e.g.', () => {
  assert.equal(sentenceCount('Bring fruit, e.g. apples. Then eat.'), 2);
});

test('does not end a sentence at an abbreviation in capitals', () => {
  assert.equal(sentenceCount('DR. Wren left.'), 1);
});

test('does not split a decimal number', () => {
  assert.equal(sentenceCount('It cost 3.14 today.'), 1);
});

test('does not split a domain name or dotted name', () => {
  assert.equal(sentenceCount('Visit example.com or a.b.c today.'), 1);
});

test('ends a sentence at a terminator followed by a closing bracket', () => {
  assert.equal(sentenceCount('(He left.) Then she came.'), 2);
});

test('ends a sentence at a terminator followed by a closing quote', () => {
  assert.equal(sentenceCount('"Go!" he said. "Now?" she asked.'), 4);
});

test('ends a sentence at an ellipsis that follows an abbreviation', () => {
  assert.equal(sentenceCount('Wait for Mr... Then go'), 2);
});
