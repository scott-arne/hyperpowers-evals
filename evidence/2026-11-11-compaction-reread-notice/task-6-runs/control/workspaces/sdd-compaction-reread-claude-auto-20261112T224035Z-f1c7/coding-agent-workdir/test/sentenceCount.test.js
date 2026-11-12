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

// --- Extended tests: behaviour stated in the brief's prose ---

test('counts the multi-line passage as eight sentences', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('each listed abbreviation followed by a period does not end a sentence', () => {
  for (const abbr of ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Sr', 'Jr', 'vs', 'e.g', 'i.e']) {
    assert.equal(sentenceCount(`See ${abbr}. Foo today`), 1, abbr);
  }
});

test('abbreviations are compared without regard to case', () => {
  for (const abbr of ['MR', 'mr', 'mRs', 'DR', 'PROF', 'prof', 'ST', 'Vs', 'VS', 'E.G', 'e.G', 'I.E', 'i.E']) {
    assert.equal(sentenceCount(`See ${abbr}. Foo today`), 1, abbr);
  }
});

test('an abbreviation followed by an opening bracket or quote is still recognised', () => {
  assert.equal(sentenceCount('He met (Dr. Wren) today'), 1);
  assert.equal(sentenceCount('He met "Mr. Wren" today'), 1);
});

test('a period after a non-abbreviation word ends a sentence', () => {
  assert.equal(sentenceCount('See Bob. Foo today'), 2);
});

test('runs of terminators end a sentence even after an abbreviation', () => {
  assert.equal(sentenceCount('Mr... Foo'), 2);
  assert.equal(sentenceCount('Dr?! Who'), 2);
  assert.equal(sentenceCount('Mr.. Foo'), 2);
  assert.equal(sentenceCount('Mr! Foo'), 2);
  assert.equal(sentenceCount('Mr? Foo'), 2);
});

test('a run of terminators is one terminator, not several sentences', () => {
  assert.equal(sentenceCount('Wait... what?! Really'), 3);
  assert.equal(sentenceCount('Stop!!! Go'), 2);
});

test('decimals do not split a sentence', () => {
  assert.equal(sentenceCount('It costs 3.14 dollars'), 1);
  assert.equal(sentenceCount('Pi is 3.14. Next'), 2);
});

test('dotted names such as example.com do not split a sentence', () => {
  assert.equal(sentenceCount('Visit example.com now'), 1);
  assert.equal(sentenceCount('Visit example.com. Then leave'), 2);
});

test('a.b.c is not split', () => {
  assert.equal(sentenceCount('a.b.c'), 1);
  assert.equal(sentenceCount('a.b.c d'), 1);
  assert.equal(sentenceCount('a.b.c.'), 1);
});

test('closing quotes and brackets after a terminator belong to that terminator', () => {
  assert.equal(sentenceCount('"Hi." Then'), 2);
  assert.equal(sentenceCount('(Stop!) Go'), 2);
  assert.equal(sentenceCount('[Done.] Next'), 2);
  assert.equal(sentenceCount("He said 'go.' Then"), 2);
  assert.equal(sentenceCount('He said “go.” Then'), 2);
  assert.equal(sentenceCount('"Hi."'), 1);
});

test('text made only of terminators and closing marks has zero sentences', () => {
  assert.equal(sentenceCount('?!'), 0);
  assert.equal(sentenceCount('...'), 0);
  assert.equal(sentenceCount('!!!'), 0);
  assert.equal(sentenceCount('."'), 0);
  assert.equal(sentenceCount('. . .'), 0);
});

test('trailing text without a terminator counts as a final sentence', () => {
  assert.equal(sentenceCount('One. Two. Three'), 3);
  assert.equal(sentenceCount('One! Two'), 2);
});

test('trailing text without a word does not count as a sentence', () => {
  assert.equal(sentenceCount('One. -- '), 1);
});
