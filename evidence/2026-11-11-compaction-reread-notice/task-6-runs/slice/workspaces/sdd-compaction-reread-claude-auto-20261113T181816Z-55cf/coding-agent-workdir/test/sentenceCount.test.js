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

// Additions beyond the brief's test code. Expected values come from the
// brief's prose (Behaviour section) and the PASSAGE comment ("Eight sentences").

test('counts eight sentences in the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not break inside decimals, domains or dotted names', () => {
  assert.equal(sentenceCount('It cost 3.14 dollars.'), 1);
  assert.equal(sentenceCount('Visit example.com today.'), 1);
  assert.equal(sentenceCount('See a.b.c now'), 1);
});

test('does not end a sentence after a listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    assert.equal(sentenceCount(`Ask ${abbr}. Smith today.`), 1, abbr);
  }
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('Ask MR. Smith today.'), 1);
  assert.equal(sentenceCount('Ask dr. Smith today.'), 1);
  assert.equal(sentenceCount('Use fruit, E.G. apples.'), 1);
});

test('still recognises an abbreviation after an opening bracket or quote', () => {
  assert.equal(sentenceCount('He met (Dr. Wren) today.'), 1);
  assert.equal(sentenceCount('He met "Mr. Alder" today.'), 1);
});

test('a run of terminators after an abbreviation still ends the sentence', () => {
  assert.equal(sentenceCount('Ask Mr... Then go'), 2);
  assert.equal(sentenceCount('Ask Dr?! Then go'), 2);
});

test('a non-listed word followed by a period ends the sentence', () => {
  assert.equal(sentenceCount('Ask Bob. Then go.'), 2);
});

test('counts runs of terminators as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes.'), 2);
  assert.equal(sentenceCount('Wait... what'), 2);
  assert.equal(sentenceCount('Wait... what...'), 2);
});

test('closing quotes and brackets stay with their terminator', () => {
  assert.equal(sentenceCount('"Go!" He went.'), 2);
  assert.equal(sentenceCount('He left (quickly.) She stayed.'), 2);
  assert.equal(sentenceCount('He said “no.” She agreed.'), 2);
});

test('a terminator needs whitespace or end of text after it', () => {
  assert.equal(sentenceCount('one.two!three?four'), 1);
});
