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

test('does not end a sentence at a lone period after a listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    assert.equal(sentenceCount(`See ${abbr}. Smith today.`), 1, abbr);
  }
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('See MR. Smith today.'), 1);
  assert.equal(sentenceCount('See E.G. Smith today.'), 1);
  assert.equal(sentenceCount('See dR. Smith today.'), 1);
});

test('ignores an opening quote or bracket before an abbreviation', () => {
  assert.equal(sentenceCount('He met ("Mr. Smith") today.'), 1);
  assert.equal(sentenceCount('He met "Mr. Smith today.'), 1);
  assert.equal(sentenceCount('He met (e.g. Smith) today.'), 1);
});

test('ends a sentence at a run of periods or marks after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Mr... Then go.'), 2);
  assert.equal(sentenceCount('Ask Dr?! Then go.'), 2);
  assert.equal(sentenceCount('Ask Dr! Then go.'), 2);
});

test('does not split decimals, dotted names or dotted letters', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly.'), 1);
  assert.equal(sentenceCount('Visit example.com now.'), 1);
  assert.equal(sentenceCount('Spell a.b.c aloud.'), 1);
});

test('absorbs closing quotes and brackets after a terminator', () => {
  assert.equal(sentenceCount('"Is that all?" she said.'), 2);
  assert.equal(sentenceCount('He left (quietly.) Then she left.'), 2);
  assert.equal(sentenceCount('It was “done.” Next.'), 2);
});
