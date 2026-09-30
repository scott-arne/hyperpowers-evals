const test = require('node:test');
const assert = require('node:assert');
const { slugify } = require('./slugify');

test('simple multi-word title', () => {
  assert.strictEqual(slugify('Hello World'), 'hello-world');
});

test('mixed case', () => {
  assert.strictEqual(slugify('ThIs Is MiXeD CaSe'), 'this-is-mixed-case');
});

test('accented characters', () => {
  assert.strictEqual(slugify('Café'), 'cafe');
  assert.strictEqual(slugify('Crème Brûlée'), 'creme-brulee');
  assert.strictEqual(slugify('Naïve résumé'), 'naive-resume');
});

test('punctuation', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
  assert.strictEqual(slugify('Hey! What?'), 'hey-what');
});

test('collapsing repeated separators and whitespace', () => {
  assert.strictEqual(slugify('a   --  b'), 'a-b');
  assert.strictEqual(slugify('foo   bar'), 'foo-bar');
  assert.strictEqual(slugify('test---case'), 'test-case');
});

test('leading and trailing whitespace and punctuation', () => {
  assert.strictEqual(slugify('  hello world  '), 'hello-world');
  assert.strictEqual(slugify('--test--'), 'test');
  assert.strictEqual(slugify('...start and end...'), 'start-and-end');
});

test('digits preserved', () => {
  assert.strictEqual(slugify('Test 123'), 'test-123');
  assert.strictEqual(slugify('Version 2.0'), 'version-2-0');
});

test('empty string', () => {
  assert.strictEqual(slugify(''), '');
});

test('whitespace-only string', () => {
  assert.strictEqual(slugify('   '), '');
  assert.strictEqual(slugify('\t\n'), '');
});

test('non-string input', () => {
  assert.strictEqual(slugify(123), '123');
  assert.strictEqual(slugify(true), 'true');
  assert.strictEqual(slugify(null), 'null');
  assert.strictEqual(slugify(undefined), 'undefined');
});
