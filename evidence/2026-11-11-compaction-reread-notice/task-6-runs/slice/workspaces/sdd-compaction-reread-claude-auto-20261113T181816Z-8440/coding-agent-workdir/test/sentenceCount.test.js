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

test('does not split a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly.'), 1);
});

test('does not split a domain name', () => {
  assert.equal(sentenceCount('Visit example.com today.'), 1);
});

test('does not split dotted letters without whitespace', () => {
  assert.equal(sentenceCount('See a.b.c for details.'), 1);
});

test('does not end a sentence after each listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    assert.equal(sentenceCount(`Ask ${abbr}. Smith now.`), 1, abbr);
  }
});

test('compares abbreviations without regard to case', () => {
  for (const abbr of ['MR', 'mr', 'DR', 'dr', 'PROF', 'VS', 'E.G', 'I.E', 'sT']) {
    assert.equal(sentenceCount(`Ask ${abbr}. Smith now.`), 1, abbr);
  }
});

test('ends a sentence at an ellipsis after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Dr... Smith now.'), 2);
});

test('ends a sentence at a question and exclamation mark after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Dr?! Smith now.'), 2);
});

test('ends a sentence at a question mark or exclamation mark after an abbreviation', () => {
  assert.equal(sentenceCount('Is it Dr? Smith knows. Wow Mr! Go on.'), 4);
});

test('keeps closing quotes and brackets with their terminator', () => {
  assert.equal(sentenceCount('He said "Go." Then (she left.) Done.'), 3);
  assert.equal(sentenceCount('He said “Go.” Then it ended.'), 2);
});

test('does not count a lone closing quote as a sentence', () => {
  assert.equal(sentenceCount('"Go." "Stop."'), 2);
});

test('treats a run of terminators as a single terminator', () => {
  assert.equal(sentenceCount('Wait... what?! Yes.'), 3);
});

test('recognises an abbreviation after an opening quote or bracket', () => {
  assert.equal(sentenceCount('Ask (Dr. Smith) now.'), 1);
  assert.equal(sentenceCount('Ask "Mr. Smith" now.'), 1);
});
