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

test('counts the hand-counted eight sentences in the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('treats a run of terminators such as ?! or ... as one terminator', () => {
  assert.equal(sentenceCount('Really?! Yes'), 2);
  assert.equal(sentenceCount('Well... maybe. Fine'), 3);
  assert.equal(sentenceCount('Wait... no'), 2);
});

test('does not end a sentence at a period inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly.'), 1);
});

test('does not end a sentence at a period inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com today. Then leave.'), 2);
  assert.equal(sentenceCount('See a.b.c now'), 1);
});

test('does not end a sentence after each listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    assert.equal(sentenceCount(`We met ${abbr}. Smith there.`), 1, abbr);
  }
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('We met MR. Smith and dr. Jones.'), 1);
  assert.equal(sentenceCount('Use fruit, E.G. apples, I.E. fresh ones.'), 1);
});

test('ends a sentence at a period after a word that is not a listed abbreviation', () => {
  assert.equal(sentenceCount('He met Bob. Smith left.'), 2);
});

test('ends a sentence at a run of terminators even after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Dr... Wren'), 2);
  assert.equal(sentenceCount('Is it Mr?! Wren'), 2);
});

test('does not end a sentence at an abbreviation inside opening quotes or brackets', () => {
  assert.equal(sentenceCount('He said (Dr. Wren) came.'), 1);
  assert.equal(sentenceCount('He said "Dr. Wren" came.'), 1);
});

test('includes closing quotes and brackets in the terminator', () => {
  assert.equal(sentenceCount('"Go." Then he left.'), 2);
  assert.equal(sentenceCount('(It ended.) Then he left.'), 2);
  assert.equal(sentenceCount('He said “stop!” She did.'), 2);
});

test('does not end a sentence at a terminator followed directly by a letter', () => {
  assert.equal(sentenceCount('one.two three'), 1);
});
