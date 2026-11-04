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

// Added tests (project owner decision): the multi-line passage and each
// behaviour rule in the task brief. Expected values are hand counts.

test('counts the eight sentences of the multi-line passage', () => {
  // 1 Mr. Alder opened the shop at nine.   2 Nobody came in until noon!
  // 3 When the first customer arrived, Dr. Wren asked ... changed.
  // 4 They had risen by 3.5 percent since spring.   5 "Is that all?"
  // 6 she said.   7 He nodded, and the afternoon went by quietly.
  // 8 By closing time the till held forty dollars.
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith met Dr. Jones.'), 1);
  assert.equal(sentenceCount('Mrs. Lee and Ms. Cho asked Prof. Kay.'), 1);
  assert.equal(sentenceCount('St. Paul wrote to Sr. Ann and Jr. Tom.'), 1);
});

test('does not end a sentence at vs, e.g or i.e', () => {
  assert.equal(sentenceCount('Cats vs. dogs is old.'), 1);
  assert.equal(sentenceCount('Pick one, e.g. the red one. Then go.'), 2);
  assert.equal(sentenceCount('Pick one, i.e. the red one. Then go.'), 2);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. Smith and dr. Jones left.'), 1);
  assert.equal(sentenceCount('E.G. this one. Then that.'), 2);
});

test('keeps an abbreviation at the end of a sentence joined to the next words', () => {
  assert.equal(sentenceCount('Ask Mr. Then go.'), 1);
});

test('ends a sentence at an abbreviation followed by a run of terminators', () => {
  assert.equal(sentenceCount('Wait Mr... Next'), 2);
  assert.equal(sentenceCount('Really Dr?! Yes'), 2);
});

test('treats a lone period after an unlisted word as a terminator', () => {
  assert.equal(sentenceCount('Ask Bob. Then go.'), 2);
});

test('treats a run of terminators as a single terminator', () => {
  assert.equal(sentenceCount('What?! No... Yes'), 3);
  assert.equal(sentenceCount('Wait... what'), 2);
});

test('does not end a sentence inside a decimal number', () => {
  assert.equal(sentenceCount('It cost 3.14 dollars.'), 1);
  assert.equal(sentenceCount('It cost 3.14 dollars. Then 2.5 more.'), 2);
});

test('does not end a sentence inside a domain or dotted name', () => {
  assert.equal(sentenceCount('Visit example.com today.'), 1);
  assert.equal(sentenceCount('Visit example.com today. Or a.b.c now.'), 2);
});

test('lets closing quotes and brackets follow a terminator', () => {
  assert.equal(sentenceCount('He said "go." Then left.'), 2);
  assert.equal(sentenceCount('"Stop!" he said. (Really?) yes.'), 4);
  assert.equal(sentenceCount("'Go?' she asked. Fine."), 3);
});

test('does not count terminators that follow the last sentence as another', () => {
  assert.equal(sentenceCount('Hi. ...'), 1);
});
