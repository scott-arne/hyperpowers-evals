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

test('treats a run of terminators as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes... Fine.'), 3);
});

test('does not end a sentence after a listed abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith left. Mrs. Jones stayed. Prof. Lee and Dr. Wu spoke.'), 3);
  assert.equal(sentenceCount('Ms. Ray met St. John and Sr. Ortiz, Jr. and Sam vs. Max.'), 1);
});

test('does not end a sentence after e.g. or i.e.', () => {
  assert.equal(sentenceCount('Bring tools, e.g. a hammer. Or a saw, i.e. something sharp.'), 2);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('Ask DR. Who and mrs. Who. Then go.'), 2);
});

test('recognises an abbreviation after an opening bracket or quote', () => {
  assert.equal(sentenceCount('He met (Dr. Who) today. Then "Mr. Big" left.'), 2);
});

test('still ends a sentence when a run follows an abbreviation', () => {
  assert.equal(sentenceCount('Wait for Mr... Smith arrived'), 2);
  assert.equal(sentenceCount('Is it Mr?! Smith arrived'), 2);
});

test('still ends a sentence after a word that merely resembles an abbreviation', () => {
  assert.equal(sentenceCount('It was a mist. Then a dream.'), 2);
});

test('does not end a sentence at a decimal point', () => {
  assert.equal(sentenceCount('3.14'), 1);
  assert.equal(sentenceCount('Pi is 3.14 and e is 2.718. Done.'), 2);
});

test('does not end a sentence inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com for more. Then leave.'), 2);
  assert.equal(sentenceCount('See a.b.c now'), 1);
});

test('ends a sentence at a period that follows a domain name', () => {
  assert.equal(sentenceCount('Visit example.com. Then leave'), 2);
});

test('ends a sentence at a terminator followed by closing quotes or brackets', () => {
  assert.equal(sentenceCount('He said "stop." Then left.'), 2);
  assert.equal(sentenceCount('(It ended.) Next one.'), 2);
  assert.equal(sentenceCount('She asked [why?] He shrugged'), 2);
  assert.equal(sentenceCount('“Stop!” Then silence.'), 2);
});

test('counts a final abbreviation with no terminator after it as one sentence', () => {
  assert.equal(sentenceCount('Ask Dr.'), 1);
});

test('treats any whitespace after a terminator as a boundary', () => {
  assert.equal(sentenceCount('One.\nTwo.\tThree.  Four.'), 4);
});
