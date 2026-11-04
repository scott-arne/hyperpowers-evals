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

test('counts the sentences of the shop passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith left.'), 1);
  assert.equal(sentenceCount('Mrs. Smith left.'), 1);
  assert.equal(sentenceCount('Ms. Smith left.'), 1);
  assert.equal(sentenceCount('Dr. Smith left.'), 1);
  assert.equal(sentenceCount('Prof. Smith left.'), 1);
});

test('does not end a sentence at a street or suffix abbreviation', () => {
  assert.equal(sentenceCount('St. Paul is nice.'), 1);
  assert.equal(sentenceCount('Sr. Lopez left.'), 1);
  assert.equal(sentenceCount('Smith Jr. left.'), 1);
});

test('does not end a sentence at vs, e.g or i.e', () => {
  assert.equal(sentenceCount('Smith vs. Jones was close.'), 1);
  assert.equal(sentenceCount('Pick one, e.g. this one.'), 1);
  assert.equal(sentenceCount('Pick one, i.e. this one.'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith left.'), 1);
  assert.equal(sentenceCount('dr. smith left.'), 1);
  assert.equal(sentenceCount('Smith VS. Jones was close.'), 1);
  assert.equal(sentenceCount('Pick one, E.G. this one.'), 1);
});

test('ends a sentence at a period after a word that is not listed', () => {
  assert.equal(sentenceCount('Cats, dogs, etc. Birds.'), 2);
});

test('ends a sentence at a run after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Mr... Smith left.'), 2);
  assert.equal(sentenceCount('Ask Dr?! Smith left.'), 2);
});

test('counts a text that ends in an abbreviation as one sentence', () => {
  assert.equal(sentenceCount('Ask Dr.'), 1);
});

test('does not end a sentence inside a decimal number', () => {
  assert.equal(sentenceCount('It costs 3.14 dollars.'), 1);
  assert.equal(sentenceCount('Pi is 3.14'), 1);
});

test('does not end a sentence inside a dotted name', () => {
  assert.equal(sentenceCount('Visit example.com today.'), 1);
  assert.equal(sentenceCount('The a.b.c module is fine.'), 1);
});

test('treats a run of periods as one terminator', () => {
  assert.equal(sentenceCount('Wait... what'), 2);
  assert.equal(sentenceCount('Wait...'), 1);
});

test('treats a mixed run of terminators as one terminator', () => {
  assert.equal(sentenceCount('Really?! Yes.'), 2);
  assert.equal(sentenceCount('Wait... what?! Really.'), 3);
});

test('treats closing quotes after a terminator as part of the terminator', () => {
  assert.equal(sentenceCount('He said "Go." Then left.'), 2);
  assert.equal(sentenceCount("She said 'Go!' Then left."), 2);
  assert.equal(sentenceCount('He said “Go.” Then left.'), 2);
  assert.equal(sentenceCount('He said ‘Go.’ Then left.'), 2);
});

test('treats closing brackets after a terminator as part of the terminator', () => {
  assert.equal(sentenceCount('(See above.) Next.'), 2);
  assert.equal(sentenceCount('See [above.] Next.'), 2);
  assert.equal(sentenceCount('(Really?!) Next one'), 2);
});

test('counts sentences separated by newlines', () => {
  assert.equal(sentenceCount('One.\nTwo.\r\nThree.'), 3);
});

test('returns 0 for a text made only of terminators and quotes', () => {
  assert.equal(sentenceCount('?!?! ...'), 0);
  assert.equal(sentenceCount('."'), 0);
});
