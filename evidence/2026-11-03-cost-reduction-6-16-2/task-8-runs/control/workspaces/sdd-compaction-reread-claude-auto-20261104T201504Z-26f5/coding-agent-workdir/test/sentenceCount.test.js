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

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith met Dr. Jones.'), 1);
  assert.equal(sentenceCount('Prof. Lee and Mrs. Ray and Ms. Fox and Sr. Gil and Jr. Tan.'), 1);
});

test('does not end a sentence at e.g., i.e., vs. or St.', () => {
  assert.equal(sentenceCount('Use fruit, e.g. apples, i.e. cheap ones.'), 1);
  assert.equal(sentenceCount('Cats vs. dogs on St. Mark Street.'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith and dr. Jones left.'), 1);
});

test('still ends a sentence at a period after a non-abbreviation word', () => {
  assert.equal(sentenceCount('He left. She stayed.'), 2);
});

test('treats an abbreviation followed by a run of periods as a sentence end', () => {
  assert.equal(sentenceCount('Ask Dr... Then go'), 2);
  assert.equal(sentenceCount('Is it Mr?! Yes'), 2);
});

test('does not end a sentence inside decimals, domains or dotted names', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly.'), 1);
  assert.equal(sentenceCount('Visit example.com today and read a.b.c now.'), 1);
});

test('treats a run of terminators as a single sentence end', () => {
  assert.equal(sentenceCount('Really?! Yes... Fine'), 3);
});

test('keeps closing quotes and brackets with the sentence they close', () => {
  assert.equal(sentenceCount('He said "stop." Then he left.'), 2);
  assert.equal(sentenceCount('It ended (finally.) Then silence.'), 2);
  assert.equal(sentenceCount('She asked “why?” He shrugged.'), 2);
  assert.equal(sentenceCount('It [broke.] Then it ran.'), 2);
});

test('does not count a closing quote or bracket after a terminator as a sentence', () => {
  assert.equal(sentenceCount('"Go!"'), 1);
  assert.equal(sentenceCount('("...")'), 0);
});
