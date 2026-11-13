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

// D1: Test PASSAGE constant has sentence count of 8
test('counts 8 sentences in the PASSAGE constant', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

// D2: Tests for Behaviour rules not covered by brief's tests

// Rule 1: Terminator followed by closing quote/bracket then whitespace
test('ends a sentence at a terminator inside a closing double quote', () => {
  assert.equal(sentenceCount('He asked "What?" She answered.'), 2);
});

test('ends a sentence at a terminator inside a closing single quote', () => {
  assert.equal(sentenceCount("She said 'hello.' He waved."), 2);
});

test('ends a sentence at a terminator inside a closing parenthesis', () => {
  assert.equal(sentenceCount('See the note (here.) It was helpful.'), 2);
});

test('ends a sentence at a terminator inside a closing square bracket', () => {
  assert.equal(sentenceCount('He said [yes!] Then left.'), 2);
});

test('ends a sentence at a terminator followed by a quote and a bracket together', () => {
  assert.equal(sentenceCount('(He said "Hello!") Really.'), 2);
});

// Rule 1: Non-breaks - decimal numbers
test('does not end sentence at period in decimal number like 3.14', () => {
  assert.equal(sentenceCount('The value is 3.14 meters long.'), 1);
});

test('does not count period inside decimal as terminator when followed by digit', () => {
  assert.equal(sentenceCount('About 2.5 years passed. Then it changed.'), 2);
});

// Rule 1: Non-breaks - dotted names like example.com
test('does not end sentence at period in domain name like example.com', () => {
  assert.equal(sentenceCount('Visit example.com today.'), 1);
});

test('does not count period in domain name as terminator', () => {
  assert.equal(sentenceCount('Check www.example.com now. It helps.'), 2);
});

// Rule 1: Non-breaks - dotted abbreviations like a.b.c
test('does not end sentence at period in dotted abbreviation like a.b.c', () => {
  assert.equal(sentenceCount('Version 1.2.3 released now.'), 1);
});

test('does not count period in a.b.c pattern as terminator', () => {
  assert.equal(sentenceCount('Version 1.2.3 is out. Upgrade now.'), 2);
});

// Rule 2: Abbreviations matched case-insensitively
test('recognizes Mr. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('mr. smith arrived. Then ms. jones left.'), 2);
});

test('recognizes Dr. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('DR. BROWN entered. PROF. GREY waited.'), 2);
});

test('recognizes Mrs. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('Mrs. Robinson helped. mrs. WILSON observed.'), 2);
});

test('recognizes Ms. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('Ms. Baker arrived. ms. CARTER waited.'), 2);
});

test('recognizes Prof. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('Prof. Smith taught. prof. JONES waited.'), 2);
});

test('recognizes St. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('St. Paul is cold. st. LOUIS is warm.'), 2);
});

test('recognizes Sr. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('John Sr. retired. JOHN JR. remained.'), 2);
});

test('recognizes Jr. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('John Jr. stayed. John sr. LEFT.'), 2);
});

test('recognizes vs. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('Smith vs. Jones continued. The trial ended.'), 2);
});

test('recognizes e.g. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('Examples (e.g. cars) help. i.e. really.'), 2);
});

test('recognizes i.e. case-insensitively as abbreviation', () => {
  assert.equal(sentenceCount('Items (i.e. things) matter. e.g. books.'), 2);
});

// Rule 2: ... and ?! after an abbreviation still end a sentence
test('ends sentence with ellipsis after abbreviation', () => {
  assert.equal(sentenceCount('Mr. Smith... Then Ms. Jones.'), 2);
});

test('ends sentence with ?! combination after abbreviation', () => {
  assert.equal(sentenceCount('Dr. Brown?! Ms. Green nodded.'), 2);
});

test('ends sentence with multiple exclamation marks after abbreviation', () => {
  assert.equal(sentenceCount('Prof. Smith!!! Then silence.'), 2);
});

// Rule 2: Opening brackets/quotes stripped before abbreviation comparison
test('ignores opening bracket before abbreviation in period check', () => {
  assert.equal(sentenceCount('(Mr. Smith) left. Then Dr. Jones arrived.'), 2);
});

test('ignores opening quote before abbreviation in period check', () => {
  assert.equal(sentenceCount('"Dr. Watson" entered. He waited.'), 2);
});

test('ignores opening parenthesis before abbreviation in period check', () => {
  assert.equal(sentenceCount('[Ms. Baker] nodded. ms. jones stayed.'), 2);
});

test('ignores multiple opening brackets/quotes before abbreviation', () => {
  assert.equal(sentenceCount('([Mr. Smith]) left. Then arrived.'), 2);
});

// Rule 3: A sentence needs a word (already mostly covered but explicit test)
test('counts sentence only if it contains a word', () => {
  assert.equal(sentenceCount('Word. ... . . . Another.'), 2);
});

// Rule 4: Trailing fragment counts as sentence
test('counts trailing text without terminator as sentence', () => {
  assert.equal(sentenceCount('First. Second'), 2);
});

test('counts multiple trailing fragments as one sentence', () => {
  assert.equal(sentenceCount('Done. More text here'), 2);
});

// Additional edge cases for robustness
test('handles sentence with only punctuation followed by word', () => {
  assert.equal(sentenceCount('!?. Word.'), 1);
});

test('handles consecutive terminators correctly', () => {
  assert.equal(sentenceCount('What?! Really'), 2);
});

test('handles period in middle of sentence not followed by space', () => {
  assert.equal(sentenceCount('Version 1.0 released today.'), 1);
});

test('distinguishes abbreviation from non-abbreviation with same letters', () => {
  assert.equal(sentenceCount('Mister. Smith arrived. Mr. Jones left'), 3);
});

// Tests for typographic (curly) quotes - D2 requirement
test('recognizes terminator followed by closing curly double quote then whitespace', () => {
  assert.equal(sentenceCount('He said “Hi.” Then left.'), 2);
});

test('recognizes terminator followed by closing curly single quote then whitespace', () => {
  assert.equal(sentenceCount('She said ‘hello.’ He waved.'), 2);
});

test('ignores opening curly double quote before abbreviation in period check', () => {
  assert.equal(sentenceCount('“Dr. Who” came. ok'), 2);
});

test('ignores opening curly single quote before abbreviation in period check', () => {
  assert.equal(sentenceCount('‘Mr. Smith’ left. Then arrived.'), 2);
});
