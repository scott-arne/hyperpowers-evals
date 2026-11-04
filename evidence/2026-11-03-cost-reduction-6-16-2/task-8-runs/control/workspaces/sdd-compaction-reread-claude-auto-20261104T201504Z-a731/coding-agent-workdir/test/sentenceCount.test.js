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

test('treats an ellipsis as a single terminator', () => {
  assert.equal(sentenceCount('Wait... what happened'), 2);
  assert.equal(sentenceCount('Wait... what happened...'), 2);
});

test('treats ?! as a single terminator', () => {
  assert.equal(sentenceCount('Really?! Yes?! Fine'), 3);
});

test('lets closing quotes after a terminator end the sentence', () => {
  assert.equal(sentenceCount('He said "stop." Then he left.'), 2);
  assert.equal(sentenceCount("She said 'go!' Then she ran."), 2);
  assert.equal(sentenceCount('He said “stop.” Then he left.'), 2);
});

test('lets closing brackets after a terminator end the sentence', () => {
  assert.equal(sentenceCount('(He left.) She stayed.'), 2);
  assert.equal(sentenceCount('See the list [it is long.] Then go.'), 2);
});

test('does not end a sentence at a period inside a decimal number', () => {
  assert.equal(sentenceCount('Pi is 3.14 roughly'), 1);
  assert.equal(sentenceCount('Pi is 3.14 roughly. Next'), 2);
});

test('does not end a sentence at a period inside a domain name', () => {
  assert.equal(sentenceCount('Visit example.com today'), 1);
  assert.equal(sentenceCount('Visit example.com today. Then leave'), 2);
});

test('does not end a sentence at periods inside a dotted name', () => {
  assert.equal(sentenceCount('The id a.b.c is valid'), 1);
});

test('does not end a sentence after each listed abbreviation', () => {
  const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e'];
  for (const abbr of abbreviations) {
    const text = `Ask ${abbr}. Smith about it`;
    assert.equal(sentenceCount(text), 1, text);
  }
});

test('compares abbreviations without regard to case', () => {
  for (const text of ['ask MR. smith', 'ask mR. smith', 'ask DR. smith', 'ask PROF. smith', 'ask E.G. smith', 'ask I.E. smith', 'ask VS. smith']) {
    assert.equal(sentenceCount(text), 1, text);
  }
});

test('does not end a sentence after an abbreviation inside an opening bracket or quote', () => {
  assert.equal(sentenceCount('Some fruit (e.g. apples) are red'), 1);
  assert.equal(sentenceCount('Some fruit (i.e. apples) are red'), 1);
  assert.equal(sentenceCount('He met "Dr. Wren" today'), 1);
  assert.equal(sentenceCount('He met “Mr. Alder” today'), 1);
  assert.equal(sentenceCount('See [St. Paul] now'), 1);
});

test('still ends a sentence at a run of terminators after an abbreviation', () => {
  assert.equal(sentenceCount('Ask Mr... Then go'), 2);
  assert.equal(sentenceCount('Ask Dr?! Then go'), 2);
  assert.equal(sentenceCount('Ask Prof!? Then go'), 2);
});
