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

test('does not end a sentence after each listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    const text = `We met ${abbr}. Smith today.`;
    assert.equal(sentenceCount(text), 1, JSON.stringify(text));
  }
});

test('matches abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith left.'), 1);
  assert.equal(sentenceCount('We met dR. Smith today.'), 1);
  assert.equal(sentenceCount('Fruit, E.G. apples, is good.'), 1);
});

test('ignores an opening quote or bracket before an abbreviation', () => {
  assert.equal(sentenceCount('(Dr. Wren arrived.)'), 1);
  assert.equal(sentenceCount('"Mr. Alder left."'), 1);
  assert.equal(sentenceCount('He said (Prof. Wren agreed.) Then he left.'), 2);
});

test('still ends a sentence when a run follows an abbreviation', () => {
  assert.equal(sentenceCount('He met Dr... Then he left'), 2);
  assert.equal(sentenceCount('Is it Dr?! Wren said yes'), 2);
});

test('does not treat a decimal as a sentence break', () => {
  assert.equal(sentenceCount('Pi is 3.14 exactly.'), 1);
});

test('does not treat dotted names as sentence breaks', () => {
  assert.equal(sentenceCount('Visit example.com now. Bye.'), 2);
  assert.equal(sentenceCount('The a.b.c module is odd'), 1);
});

test('counts a run of terminators as one terminator', () => {
  assert.equal(sentenceCount('Wait... what'), 2);
  assert.equal(sentenceCount('Really?! Yes.'), 2);
});

test('absorbs closing quotes and brackets after a terminator', () => {
  assert.equal(sentenceCount('"Stop!" he said.'), 2);
  assert.equal(sentenceCount('"Stop!" Go.'), 2);
  assert.equal(sentenceCount('(Go now.) Then stop.'), 2);
});
