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

test('counts the multi-line passage as eight sentences', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence after each listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs']) {
    assert.equal(sentenceCount(`We met ${abbr}. Smith today. Then we left.`), 2, abbr);
  }
});

test('does not end a sentence after e.g. or i.e.', () => {
  assert.equal(sentenceCount('Bring tools, e.g. hammers. Then leave.'), 2);
  assert.equal(sentenceCount('Bring tools, i.e. hammers. Then leave.'), 2);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('We met MR. Smith and dr. Jones. Then we left.'), 2);
  assert.equal(sentenceCount('Bring tools, E.G. hammers. Then leave.'), 2);
  assert.equal(sentenceCount('Fish VS. chips was close. Chips won.'), 2);
});

test('ends a sentence when an ellipsis follows an abbreviation', () => {
  assert.equal(sentenceCount('We waited for Mr... Smith arrived late.'), 2);
  assert.equal(sentenceCount('Bring tools, e.g... Then leave.'), 2);
});

test('ends a sentence when ?! follows an abbreviation', () => {
  assert.equal(sentenceCount('Was it Dr?! Yes it was.'), 2);
});

test('does not split a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly. Done.'), 2);
});

test('does not split a domain name or a dotted name', () => {
  assert.equal(sentenceCount('Visit example.com today. Bye.'), 2);
  assert.equal(sentenceCount('The id a.b.c is valid. Bye.'), 2);
});

test('ends a sentence at a terminator followed by a closing quote', () => {
  assert.equal(sentenceCount('He said "Go." Then he left.'), 2);
  assert.equal(sentenceCount("She said 'Why?' Then she left."), 2);
  assert.equal(sentenceCount('He said “Go.” Then he left.'), 2);
  assert.equal(sentenceCount('She said ‘Stop.’ Then she ran.'), 2);
});

test('ends a sentence at a terminator followed by a closing bracket', () => {
  assert.equal(sentenceCount('(See above.) Next one.'), 2);
  assert.equal(sentenceCount('Items [one!] two.'), 2);
});

test('returns 0 for a text made only of terminators', () => {
  assert.equal(sentenceCount('!!! ... ???'), 0);
});

test('counts text after an abbreviation at the very end', () => {
  assert.equal(sentenceCount('Hello Mr.'), 1);
});
