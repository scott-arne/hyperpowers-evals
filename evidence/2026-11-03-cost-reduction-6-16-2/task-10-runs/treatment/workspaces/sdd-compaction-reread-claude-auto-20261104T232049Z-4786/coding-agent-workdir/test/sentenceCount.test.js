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

test('does not end a sentence at any listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    assert.equal(sentenceCount(`See ${abbr}. Smith today.`), 1, abbr);
  }
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('See MR. Smith and dr. Jones today.'), 1);
});

test('recognises an abbreviation that follows an opening bracket', () => {
  assert.equal(sentenceCount('He met (Dr. Wren) today.'), 1);
});

test('ends a sentence at a word that only resembles an abbreviation', () => {
  assert.equal(sentenceCount('It was Mister. Then it ended.'), 2);
});

test('ends a sentence at an abbreviation followed by an ellipsis', () => {
  assert.equal(sentenceCount('Ask Dr... Then leave.'), 2);
});

test('ends a sentence at an abbreviation followed by a question mark', () => {
  assert.equal(sentenceCount('Is it Mr? Then leave.'), 2);
});

test('does not end a sentence inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly.'), 1);
});

test('does not end a sentence inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com for more. Then go.'), 2);
});

test('does not end a sentence inside a dotted name such as a.b.c', () => {
  assert.equal(sentenceCount('The key a.b.c is set'), 1);
});

test('treats a run of terminators as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes... Fine.'), 3);
});

test('ends a sentence at a terminator followed by a closing double quote', () => {
  assert.equal(sentenceCount('He said "stop." Then he left.'), 2);
});

test('ends a sentence at a terminator followed by a typographic closing quote', () => {
  assert.equal(sentenceCount('He said “stop.” Then he left.'), 2);
});

test('ends a sentence at a terminator followed by a closing bracket', () => {
  assert.equal(sentenceCount('It ended (really.) Then more came [truly!] Done.'), 3);
});

test('ends a sentence at a terminator followed by a closing quote at the end of the text', () => {
  assert.equal(sentenceCount('He said "stop."'), 1);
});

test('treats a newline after a terminator as whitespace', () => {
  assert.equal(sentenceCount('One.\nTwo.\n\nThree.'), 3);
});
