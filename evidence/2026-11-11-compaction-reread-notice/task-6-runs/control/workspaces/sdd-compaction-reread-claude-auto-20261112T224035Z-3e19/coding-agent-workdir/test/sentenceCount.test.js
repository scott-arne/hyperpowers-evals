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

test('counts the passage at its hand-counted eight sentences', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Dr. Wren left. He stayed.'), 2);
  assert.equal(sentenceCount('Mr. and Mrs. Alder arrived.'), 1);
});

test('does not end a sentence at e.g. or i.e.', () => {
  assert.equal(sentenceCount('Bring fruit, e.g. apples. Then go.'), 2);
  assert.equal(sentenceCount('It was late, i.e. past nine. We left.'), 2);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('DR. Wren left. He stayed.'), 2);
});

test('a run of periods after an abbreviation still ends a sentence', () => {
  assert.equal(sentenceCount('Dr... Wren'), 2);
});

test('a trailing abbreviation with words before it counts as one sentence', () => {
  assert.equal(sentenceCount('He met Mr.'), 1);
});

test('does not end a sentence inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 today. Fine.'), 2);
  assert.equal(sentenceCount('It rose 3.5 percent'), 1);
});

test('does not end a sentence inside a domain name or dotted run', () => {
  assert.equal(sentenceCount('Visit example.com now. Thanks.'), 2);
  assert.equal(sentenceCount('See a.b.c for more'), 1);
});

test('counts a terminator followed by a closing quote as one break', () => {
  assert.equal(sentenceCount('"Stop!" he said. Go.'), 3);
  assert.equal(sentenceCount('He said “no.” She left.'), 2);
});

test('counts a terminator followed by a closing bracket as one break', () => {
  assert.equal(sentenceCount('(It rained.) Then it stopped.'), 2);
  assert.equal(sentenceCount('See [note one.] Next.'), 2);
});

test('treats a terminator run as a single break', () => {
  assert.equal(sentenceCount('Really?! Yes... fine.'), 3);
});
