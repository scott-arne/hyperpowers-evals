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

test('treats a terminator followed by closing quotes as a sentence end', () => {
  assert.equal(sentenceCount('He said "Go." Then left.'), 2);
});

test('treats a terminator followed by a closing bracket as a sentence end', () => {
  assert.equal(sentenceCount('(See above.) Next.'), 2);
});

test('does not break at the period in a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 and more'), 1);
});

test('does not break at the period in a domain name', () => {
  assert.equal(sentenceCount('Visit example.com today'), 1);
});

test('does not break at the periods in a dotted name', () => {
  assert.equal(sentenceCount('a.b.c'), 1);
});

test('does not end a sentence at any listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs']) {
    assert.equal(sentenceCount(`${abbr}. Smith left`), 1, abbr);
  }
});

test('does not end a sentence at e.g. or i.e.', () => {
  assert.equal(sentenceCount('Use fruit, e.g. apples'), 1);
  assert.equal(sentenceCount('Use fruit, i.e. apples'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith left'), 1);
  assert.equal(sentenceCount('dr. smith left'), 1);
  assert.equal(sentenceCount('Fruit, E.G. apples'), 1);
});

test('strips an opening bracket or quote before matching an abbreviation', () => {
  assert.equal(sentenceCount('(Dr. Smith left)'), 1);
  assert.equal(sentenceCount('He met "Mr. Smith" today'), 1);
});

test('still ends a sentence at an abbreviation followed by a run', () => {
  assert.equal(sentenceCount('Ask Dr... Smith'), 2);
  assert.equal(sentenceCount('Ask Dr?! Smith'), 2);
});

test('still ends a sentence at a non-abbreviation word before a period', () => {
  assert.equal(sentenceCount('Fruit, e.g. apples. Done'), 2);
});

test('returns 0 for terminator-only text', () => {
  assert.equal(sentenceCount('?!'), 0);
  assert.equal(sentenceCount('...'), 0);
});

test('ignores a trailing segment with no words after the last terminator', () => {
  assert.equal(sentenceCount('One. ...'), 1);
});
