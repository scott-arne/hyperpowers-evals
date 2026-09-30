const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for a valid name', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello, Alice!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles undefined gracefully', () => {
  const result = greet(undefined);
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles null gracefully', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Hello, there!');
});

test('greet formats greeting with different names', () => {
  assert.strictEqual(greet('Bob'), 'Hello, Bob!');
  assert.strictEqual(greet('Charlie'), 'Hello, Charlie!');
});
