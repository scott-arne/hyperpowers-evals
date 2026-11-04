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

const ABBREVIATIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e'];

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

test('counts the passage as eight sentences', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('a period after each listed abbreviation does not end a sentence', () => {
  for (const abbr of ABBREVIATIONS) {
    const text = `We asked ${abbr}. Lane today.`;
    assert.equal(sentenceCount(text), 1, JSON.stringify(text));
  }
});

test('abbreviations are compared without regard to case', () => {
  for (const abbr of ABBREVIATIONS) {
    for (const variant of [abbr.toLowerCase(), abbr.toUpperCase()]) {
      const text = `We asked ${variant}. Lane today.`;
      assert.equal(sentenceCount(text), 1, JSON.stringify(text));
    }
  }
});

test('an opening quote or bracket before an abbreviation does not hide it', () => {
  for (const abbr of ABBREVIATIONS) {
    for (const open of ['"', '(', '[', '“']) {
      const text = `We asked ${open}${abbr}. Lane today.`;
      assert.equal(sentenceCount(text), 1, JSON.stringify(text));
    }
  }
});

test('a run after an abbreviation still ends the sentence', () => {
  assert.equal(sentenceCount('We asked Dr... Lane came'), 2);
  assert.equal(sentenceCount('Was it Mr?! Lane came'), 2);
  assert.equal(sentenceCount('Was it Prof!! Lane came'), 2);
});

test('a lone period after a non-abbreviation still ends the sentence', () => {
  assert.equal(sentenceCount('We asked Lane. Then left.'), 2);
});

test('decimals, domains and dotted names are not broken', () => {
  assert.equal(sentenceCount('It costs 3.14 dollars'), 1);
  assert.equal(sentenceCount('Visit example.com today'), 1);
  assert.equal(sentenceCount('The a.b.c module'), 1);
});

test('closing quotes and brackets after a terminator stay with the sentence', () => {
  assert.equal(sentenceCount('He said "stop." Then left.'), 2);
  assert.equal(sentenceCount('He said “stop.” Then left.'), 2);
  assert.equal(sentenceCount('(He left.) She stayed.'), 2);
  assert.equal(sentenceCount('See [note one.] Then stop.'), 2);
  assert.equal(sentenceCount('Is it so?") Then stop.'), 2);
});
