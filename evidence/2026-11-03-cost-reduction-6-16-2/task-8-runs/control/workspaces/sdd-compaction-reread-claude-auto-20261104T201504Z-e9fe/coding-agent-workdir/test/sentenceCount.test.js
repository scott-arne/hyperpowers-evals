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

const ABBREVIATIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e'];

test('returns 0 for the empty string', () => {
  assert.equal(sentenceCount(''), 0);
});

test('returns 0 for whitespace only', () => {
  assert.equal(sentenceCount('  \n\t  '), 0);
});

test('returns 0 for terminators with no words', () => {
  assert.equal(sentenceCount('... ?! . ! ?'), 0);
});

test('returns 0 for a text made only of one terminator run', () => {
  assert.equal(sentenceCount('...'), 0);
  assert.equal(sentenceCount('?!.'), 0);
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

test('counts the eight sentences of the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not split at the period inside a decimal number', () => {
  assert.equal(sentenceCount('It costs 3.14 dollars. Pay it.'), 2);
});

test('does not split at periods inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com now. Thanks.'), 2);
});

test('does not split at periods inside a dotted name', () => {
  assert.equal(sentenceCount('See a.b.c here. Ok.'), 2);
});

test('does not end a sentence at a listed abbreviation', () => {
  for (const abbr of ABBREVIATIONS) {
    assert.equal(sentenceCount(`${abbr}. Smith left.`), 1, abbr);
  }
});

test('compares abbreviations without regard to case', () => {
  for (const text of ['MR. Smith left.', 'mr. Smith left.', 'E.G. Smith left.', 'I.e. Smith left.', 'VS. Smith left.']) {
    assert.equal(sentenceCount(text), 1, text);
  }
});

test('does not end a sentence at a bracketed abbreviation', () => {
  assert.equal(sentenceCount('(Mr.) Smith left.'), 1);
});

test('ends a sentence at an ellipsis after an abbreviation', () => {
  assert.equal(sentenceCount('Mr... Smith left.'), 2);
});

test('ends a sentence at an interrobang after an abbreviation', () => {
  assert.equal(sentenceCount('Dr?! Smith left.'), 2);
});

test('ends a sentence at a period after a word that is not an abbreviation', () => {
  assert.equal(sentenceCount('Mister. Smith left.'), 2);
});

test('lets a closing quote follow a terminator', () => {
  assert.equal(sentenceCount('"Hi." Then'), 2);
});

test('lets a closing bracket follow a terminator', () => {
  assert.equal(sentenceCount('(done.) Next'), 2);
  assert.equal(sentenceCount('[Stop.] Go'), 2);
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
