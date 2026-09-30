const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for a name', () => {
  assert.strictEqual(greet('Alice'), 'Hello, Alice!');
});

test('greet returns formatted greeting for another name', () => {
  assert.strictEqual(greet('Bob'), 'Hello, Bob!');
});

test('greet handles empty string gracefully', () => {
  assert.strictEqual(greet(''), 'Hello, Guest!');
});

test('greet handles null gracefully', () => {
  assert.strictEqual(greet(null), 'Hello, Guest!');
});

test('greet handles undefined gracefully', () => {
  assert.strictEqual(greet(undefined), 'Hello, Guest!');
});
