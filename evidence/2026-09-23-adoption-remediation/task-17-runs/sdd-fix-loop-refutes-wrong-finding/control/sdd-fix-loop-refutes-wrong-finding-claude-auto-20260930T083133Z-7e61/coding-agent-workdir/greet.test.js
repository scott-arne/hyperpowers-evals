const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting with name', () => {
  assert.strictEqual(greet('Alice'), 'Hello, Alice!');
  assert.strictEqual(greet('Bob'), 'Hello, Bob!');
});

test('greet handles empty string with default', () => {
  assert.strictEqual(greet(''), 'Hello, there!');
});

test('greet handles missing argument with default', () => {
  assert.strictEqual(greet(), 'Hello, there!');
});

test('greet handles whitespace-only input', () => {
  assert.strictEqual(greet('   '), 'Hello,    !');
});
