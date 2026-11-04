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

test('treats ?! as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes it was'), 2);
});

test('treats an ellipsis as a single terminator', () => {
  assert.equal(sentenceCount('Wait... what happened'), 2);
});

test('lets a closing double quote follow a terminator', () => {
  assert.equal(sentenceCount('He said "Go." Then he left.'), 2);
});

test('lets a closing bracket follow a terminator', () => {
  assert.equal(sentenceCount('It ended (finally.) Then it began.'), 2);
});

test('does not end a sentence at the period in a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 exactly'), 1);
});

test('does not end a sentence at the period in a domain name', () => {
  assert.equal(sentenceCount('Visit example.com today'), 1);
});

test('does not end a sentence at the periods in a dotted name', () => {
  assert.equal(sentenceCount('See a.b.c now'), 1);
});

test('does not end a sentence after each listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    const text = `Ask ${abbr}. Smith about it`;
    assert.equal(sentenceCount(text), 1, text);
  }
});

test('ignores the case of an abbreviation', () => {
  for (const abbr of ['MR', 'dr', 'PROF', 'Vs', 'E.G', 'I.e']) {
    const text = `Ask ${abbr}. Smith about it`;
    assert.equal(sentenceCount(text), 1, text);
  }
});

test('ends a sentence at an ellipsis after an abbreviation', () => {
  assert.equal(sentenceCount('Wait for Dr... Wren came'), 2);
});

test('ends a sentence at ?! after an abbreviation', () => {
  assert.equal(sentenceCount('Was it Mr?! Yes it was'), 2);
});
