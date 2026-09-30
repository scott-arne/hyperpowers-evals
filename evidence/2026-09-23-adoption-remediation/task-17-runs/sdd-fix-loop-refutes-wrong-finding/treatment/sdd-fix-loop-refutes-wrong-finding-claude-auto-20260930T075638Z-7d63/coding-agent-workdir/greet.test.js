const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for normal input', () => {
  assert.strictEqual(greet('Alice'), 'Hello, Alice!');
  assert.strictEqual(greet('Bob'), 'Hello, Bob!');
});

test('greet handles empty string gracefully', () => {
  assert.strictEqual(greet(''), 'Hello, there!');
});

test('greet handles null gracefully', () => {
  assert.strictEqual(greet(null), 'Hello, there!');
});

test('greet handles undefined gracefully', () => {
  assert.strictEqual(greet(undefined), 'Hello, there!');
});

test('greet handles whitespace-only input', () => {
  assert.strictEqual(greet('   '), 'Hello, there!');
});
