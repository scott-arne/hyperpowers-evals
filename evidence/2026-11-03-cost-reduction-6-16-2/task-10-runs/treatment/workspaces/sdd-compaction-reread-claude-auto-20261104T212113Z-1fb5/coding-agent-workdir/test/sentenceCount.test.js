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

test('counts the sentences in a multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith met Mrs. Jones and Dr. Who.'), 1);
});

test('does not end a sentence at the other listed abbreviations', () => {
  assert.equal(sentenceCount('Prof. Ng, Ms. Lee, St. Paul, Sr. Cruz and Jr. Cruz won vs. Bob.'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith met dr. Who and PROF. Ng.'), 1);
});

test('does not end a sentence at e.g. or i.e. in any case', () => {
  assert.equal(sentenceCount('Use a tool, e.g. a hammer, i.e. something heavy.'), 1);
  assert.equal(sentenceCount('Use a tool, E.G. a hammer, I.E. something heavy.'), 1);
});

test('does not end a sentence at a period inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is about 3.14 and e is about 2.72.'), 1);
});

test('does not end a sentence at a period inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com for details.'), 1);
});

test('does not end a sentence at periods inside a dotted name', () => {
  assert.equal(sentenceCount('The key a.b.c is set. Done'), 2);
});

test('ends a sentence at a terminator followed by a closing quote', () => {
  assert.equal(sentenceCount('"Stop!" He ran. She said "Go." Then left.'), 4);
});

test('ends a sentence at a terminator followed by a closing bracket', () => {
  assert.equal(sentenceCount('(It rained.) It stopped. [Really?] Yes.'), 4);
});

test('ends a sentence at an ellipsis that follows an abbreviation', () => {
  assert.equal(sentenceCount('He asked for Mr... Then he left.'), 2);
});

test('ends a sentence at a question and exclamation mark that follow an abbreviation', () => {
  assert.equal(sentenceCount('Was it Dr?! Yes it was.'), 2);
});
