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

test('counts eight sentences in the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a title abbreviation in the passage', () => {
  assert.equal(sentenceCount('Mr. Alder opened the shop at nine.'), 1);
  assert.equal(sentenceCount('Then Dr. Wren asked why.'), 1);
});

test('does not end a sentence after any listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    const text = `See ${abbr}. Smith today.`;
    assert.equal(sentenceCount(text), 1, JSON.stringify(text));
  }
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('See MR. Smith and dr. Jones.'), 1);
  assert.equal(sentenceCount('Fruit, E.G. apples, are good.'), 1);
});

test('does not end a sentence after e.g. or i.e.', () => {
  assert.equal(sentenceCount('Bring fruit, e.g. apples. Then go.'), 2);
  assert.equal(sentenceCount('Bring fruit, i.e. apples. Then go.'), 2);
});

test('ends a sentence at a run of periods even after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Mr... Then leave.'), 2);
  assert.equal(sentenceCount('Ask Dr?! Then leave.'), 2);
});

test('does not treat a word that merely ends like an abbreviation as one', () => {
  assert.equal(sentenceCount('We met the Mayor. They left.'), 2);
  assert.equal(sentenceCount('We saw the Past. They left.'), 2);
});

test('counts a trailing abbreviation at the end of the text as one sentence', () => {
  assert.equal(sentenceCount('Ask for Mr.'), 1);
});

test('does not split inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly.'), 1);
  assert.equal(sentenceCount('Rates rose 3.5 percent. Then fell 0.25 points.'), 2);
});

test('does not split inside a domain name or dotted name', () => {
  assert.equal(sentenceCount('Visit example.com today.'), 1);
  assert.equal(sentenceCount('The id a.b.c is valid. Next one.'), 2);
});

test('ends a sentence at a domain name that is followed by a period', () => {
  assert.equal(sentenceCount('Visit example.com. Then leave.'), 2);
});

test('treats a run of terminators as a single terminator', () => {
  assert.equal(sentenceCount('Wait... what?! Really'), 3);
  assert.equal(sentenceCount('Wait... what'), 2);
});

test('keeps a closing quote with the sentence it closes', () => {
  assert.equal(sentenceCount('She said "stop." Then she left.'), 2);
  assert.equal(sentenceCount('"Is that all?" she said.'), 2);
  assert.equal(sentenceCount('He said “go.” Then he left.'), 2);
  assert.equal(sentenceCount("It was 'fine.' Then it rained."), 2);
});

test('keeps a closing bracket with the sentence it closes', () => {
  assert.equal(sentenceCount('It rained (a lot.) Then it stopped.'), 2);
  assert.equal(sentenceCount('See the list [here.] Then go.'), 2);
  assert.equal(sentenceCount('He left (quietly!) Then she did.'), 2);
});

test('does not end a sentence at a terminator followed by a non-space character', () => {
  assert.equal(sentenceCount('Really?yes. Done.'), 2);
});
