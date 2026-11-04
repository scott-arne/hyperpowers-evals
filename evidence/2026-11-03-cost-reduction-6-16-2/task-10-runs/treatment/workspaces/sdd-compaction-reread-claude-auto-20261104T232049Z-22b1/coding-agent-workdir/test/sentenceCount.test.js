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

// Added tests: behaviours the brief specifies but its own tests do not cover.

test('counts the eight sentences of the multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('does not end a sentence at a title abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith met Mrs. Jones and Dr. Who.'), 1);
});

test('does not end a sentence at any listed abbreviation', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs']) {
    assert.equal(sentenceCount(`We met ${abbr}. Lee today.`), 1, abbr);
  }
});

test('does not end a sentence at e.g. or i.e.', () => {
  assert.equal(sentenceCount('Bring fruit, e.g. apples, to the party.'), 1);
  assert.equal(sentenceCount('It is cold, i.e. freezing, outside.'), 1);
});

test('compares abbreviations without regard to case', () => {
  assert.equal(sentenceCount('MR. SMITH and dr. who and E.G. this.'), 1);
});

test('ignores an opening quote or bracket before an abbreviation', () => {
  assert.equal(sentenceCount('"Dr. Who" is here.'), 1);
  assert.equal(sentenceCount('(Mr. Smith) left.'), 1);
});

test('compares the whole word, not just its ending', () => {
  assert.equal(sentenceCount('That was humr. Next one.'), 2);
});

test('ends a sentence at a run of periods even after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Mr... Smith left.'), 2);
});

test('ends a sentence at a non-period terminator after an abbreviation', () => {
  assert.equal(sentenceCount('Hello Mr! Smith left.'), 2);
  assert.equal(sentenceCount('Hello Dr? Smith left.'), 2);
});

test('counts a text ending in an abbreviation as one sentence', () => {
  assert.equal(sentenceCount('Ask Dr.'), 1);
});

test('does not end a sentence inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 and e is 2.718 exactly.'), 1);
});

test('does not end a sentence inside a domain name or dotted name', () => {
  assert.equal(sentenceCount('Visit example.com today.'), 1);
  assert.equal(sentenceCount('See a.b.c now.'), 1);
});

test('keeps closing straight and typographic quotes with the sentence', () => {
  assert.equal(sentenceCount('He said "stop." Then he left.'), 2);
  assert.equal(sentenceCount('She said \u201Cgo.\u201D Then she left.'), 2);
  assert.equal(sentenceCount("It was 'fine.' Truly."), 2);
});

test('keeps closing brackets with the sentence', () => {
  assert.equal(sentenceCount('He left (quickly.) Then she came.'), 2);
  assert.equal(sentenceCount('See [note.] Then go.'), 2);
});

test('treats a mixed run such as ?! as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes... fine.'), 3);
});
