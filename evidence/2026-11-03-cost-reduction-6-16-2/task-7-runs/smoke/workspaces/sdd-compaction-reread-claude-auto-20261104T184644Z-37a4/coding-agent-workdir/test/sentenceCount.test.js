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

// Reference table: every row below also appears in the plan's reference section.
const CASES = [
  ["", 0],
  [" ", 0],
  [".", 0],
  ["a", 1],
  ["a.", 1],
  ["a. b.", 2],
  ["a! b? c.", 3],
  ["a!? b", 2],
  ["a?! b", 2],
  ["a... b", 2],
  ["a.. b", 2],
  ["a . b", 2],
  ["hello world", 1],
  ["Hello world.", 1],
  ["Hello world. ", 1],
  [" Hello world.", 1],
  ["Hello.World", 1],
  ["Hello. World", 2],
  ["Hello.\nWorld", 2],
  ["Hello.\n\nWorld.", 2],
  ["One. Two. Three. Four.", 4],
  ["Yes! Yes! Yes!", 3],
  ["Why? Because.", 2],
  ["What?!", 1],
  ["What?! Really?!", 2],
  ["3.14", 1],
  ["3.14.", 1],
  ["It is 3.14. Next.", 2],
  ["v1.2.3 is out.", 1],
  ["See example.com. Then leave.", 2],
  ["Mr. Smith", 1],
  ["Mr. Smith went. He left.", 2],
  ["Mrs. Smith", 1],
  ["Ms. Smith", 1],
  ["Dr. Smith", 1],
  ["Prof. Smith", 1],
  ["St. Paul", 1],
  ["Sr. Smith", 1],
  ["Smith Jr. arrived.", 1],
  ["Cats vs. dogs.", 1],
  ["e.g. this", 1],
  ["i.e. that", 1],
  ["E.g. this", 1],
  ["Dr. A. Smith", 2],
  ["(Mr. Smith)", 1],
  ["\"Mr. Smith\"", 1],
  ["He said \"hi.\" Then left.", 2],
  ["He said \"hi.\". Then left.", 2],
  ["He said 'hi.' Then left.", 2],
  ["(Done.) Next.", 2],
  ["[Done.] Next.", 2],
  ["Done.) Next.", 2],
  ["Wait... what? Oh!", 3],
  ["Wait…", 1],
  ["Really…? Yes.", 2],
  ["a,b,c", 1],
  ["a, b. c, d.", 2],
  ["No terminator here", 1],
  ["Trailing words after. Here", 2],
  ["A. B. C.", 3],
  ["U.S.A. is big.", 2],
  ["Hello!!!", 1],
  ["Hello!!! World???", 2],
  ["...Start", 1],
  ["... Start", 1],
  ["End ...", 1],
  ["End... ", 1],
  ["one\ntwo\nthree", 1],
  ["one.\ntwo.\nthree.", 3],
  ["Line one.\r\nLine two.", 2],
  ["Tab\tseparated. Yes.", 2],
  ["Ends with quote.\"", 1],
  ["Ends with quote.\" And more.", 2],
  ["''", 0],
  ["'.'", 0],
  ["?", 0],
  ["A ? B", 2],
  ["Is it? It is.", 2],
  ["1) First", 1],
  ["Fig. 3 shows it.", 2],
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

test('counts sentences ended by periods, question marks and exclamation marks', () => {
  assert.equal(sentenceCount('It rose. Did it fall? It did not!'), 3);
});

test('treats a run of terminators as one boundary', () => {
  assert.equal(sentenceCount('Really?! Yes... truly!!!'), 3);
});

test('treats an ellipsis in mid-sentence flow as a boundary when followed by a space', () => {
  assert.equal(sentenceCount('Wait... what happened here?'), 2);
});

test('does not break at a decimal point', () => {
  assert.equal(sentenceCount('The ratio was 3.14 exactly.'), 1);
});

test('does not break at a dot inside a domain name', () => {
  assert.equal(sentenceCount('Go to example.com for details.'), 1);
});

test('does not break after common titles', () => {
  assert.equal(sentenceCount('Mrs. Hale and Prof. Quill met Dr. Moss.'), 1);
});

test('does not break after e.g. or i.e.', () => {
  assert.equal(sentenceCount('Bring snacks, e.g. fruit, or something else, i.e. anything light.'), 1);
});

test('is case-insensitive about abbreviations', () => {
  assert.equal(sentenceCount('MR. Hale and DR. Moss agreed.'), 1);
});

test('still breaks at a real sentence end that comes before a title', () => {
  assert.equal(sentenceCount('He thanked her. Mr. Hale left.'), 2);
});

test('keeps a closing quote with the sentence it ends', () => {
  assert.equal(sentenceCount('"Stop!" she said. "Please." He stopped.'), 4);
});

test('keeps a closing bracket with the sentence it ends', () => {
  assert.equal(sentenceCount('The lamp (the old one.) was lit. It burned.'), 3);
});

test('does not count a terminator inside a word', () => {
  assert.equal(sentenceCount('a.b.c is not a sentence break'), 1);
});

test('counts sentences across newlines', () => {
  assert.equal(sentenceCount('First line.\nSecond line.\n\nThird line.'), 3);
});

test('counts a multi-line passage', () => {
  assert.equal(sentenceCount(PASSAGE), 8);
});

test('gives the same answer when called twice', () => {
  assert.equal(sentenceCount(PASSAGE), sentenceCount(PASSAGE));
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
