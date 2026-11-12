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

test('the PASSAGE constant holds eight sentences (hand-counted)', () => {
  // 1 Mr. Alder ... nine.  2 Nobody ... noon!  3 When ... changed.
  // 4 They had risen ... spring.  5 "Is that all?"  6 she said.
  // 7 He nodded ... quietly.  8 By closing ... dollars.
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('a lone period after each listed abbreviation does not end a sentence', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    assert.equal(sentenceCount(`See ${abbr}. Smith today.`), 1, abbr);
  }
});

test('abbreviations are compared without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith and dr. Jones left.'), 1);
  assert.equal(sentenceCount('Use fruit, E.G. apples.'), 1);
});

test('an abbreviation after an opening bracket or quote still does not end a sentence', () => {
  assert.equal(sentenceCount('He met (Dr. Wren) and "Mr. Alder" today.'), 1);
});

test('a run of periods after an abbreviation does end a sentence', () => {
  assert.equal(sentenceCount('Ask Mr... Then go.'), 2);
});

test('a non-listed word before a period ends a sentence', () => {
  assert.equal(sentenceCount('Ask Bob. Then go.'), 2);
});

test('decimals and dotted names do not split', () => {
  assert.equal(sentenceCount('It rose 3.5 percent.'), 1);
  assert.equal(sentenceCount('Visit example.com or a.b.c now.'), 1);
  assert.equal(sentenceCount('Pi is 3.14. Done.'), 2);
});

test('closing quotes and brackets after a terminator stay with the sentence', () => {
  assert.equal(sentenceCount('He said "stop." Then he left.'), 2);
  assert.equal(sentenceCount('(See above.) Then more.'), 2);
  assert.equal(sentenceCount('Is it so?" She nodded.'), 2);
  assert.equal(sentenceCount('He said \u201Cstop.\u201D Then left.'), 2);
  assert.equal(sentenceCount('Really?!) Yes.'), 2);
});
