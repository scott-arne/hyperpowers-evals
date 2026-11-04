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

test('counts the eight hand-counted sentences in the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Alder left. Dr. Wren stayed.'), 2);
});

test('does not end a sentence at any listed abbreviation, in any case', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e', 'MR', 'PROF']) {
    assert.equal(sentenceCount(`See ${abbr}. Smith now.`), 1, abbr);
  }
});

test('does not end a sentence at e.g. or i.e. in the middle of a sentence', () => {
  assert.equal(sentenceCount('Bring fruit, e.g. apples, or snacks, i.e. nuts. Thanks.'), 2);
});

test('ends a sentence at an abbreviation run such as an ellipsis', () => {
  assert.equal(sentenceCount('Ask Dr... then leave'), 2);
});

test('ends a sentence at an unlisted word followed by a period', () => {
  assert.equal(sentenceCount('It was late. Go now.'), 2);
});

test('does not split a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly. Next.'), 2);
});

test('does not split a dotted name such as example.com', () => {
  assert.equal(sentenceCount('Visit example.com today. Or a.b.c now.'), 2);
});

test('treats ?! and ... as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes... Fine.'), 3);
});

test('keeps closing quotes and brackets with the terminator', () => {
  assert.equal(sentenceCount('She said "go." He (quietly) left. [Done.] Yes'), 4);
});

test('does not mutate or depend on state between calls', () => {
  assert.equal(sentenceCount(PASSAGE), sentenceCount(PASSAGE));
  assert.equal(sentenceCount('a. b.'), 2);
});
