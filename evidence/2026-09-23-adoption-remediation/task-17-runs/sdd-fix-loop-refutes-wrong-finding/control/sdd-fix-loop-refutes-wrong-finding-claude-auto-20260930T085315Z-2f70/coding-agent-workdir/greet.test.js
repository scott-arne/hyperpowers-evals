const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting with name', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello, Alice!');
});

test('greet returns formatted greeting with different name', () => {
  const result = greet('Bob');
  assert.strictEqual(result, 'Hello, Bob!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, stranger!');
});

test('greet handles null gracefully', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Hello, stranger!');
});

test('greet handles undefined gracefully', () => {
  const result = greet(undefined);
  assert.strictEqual(result, 'Hello, stranger!');
});
