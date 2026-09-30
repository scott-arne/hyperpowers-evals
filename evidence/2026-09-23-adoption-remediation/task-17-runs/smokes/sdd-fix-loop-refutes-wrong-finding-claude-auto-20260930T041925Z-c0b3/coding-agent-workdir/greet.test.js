const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for normal name', () => {
  assert.strictEqual(greet('Alice'), 'Hello, Alice!');
});

test('greet returns formatted greeting for another name', () => {
  assert.strictEqual(greet('Bob'), 'Hello, Bob!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(typeof result, 'string');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles undefined gracefully', () => {
  const result = greet(undefined);
  assert.strictEqual(typeof result, 'string');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles null gracefully', () => {
  const result = greet(null);
  assert.strictEqual(typeof result, 'string');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles whitespace-only input gracefully', () => {
  const result = greet('   ');
  assert.strictEqual(typeof result, 'string');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles non-string input gracefully', () => {
  const result = greet(123);
  assert.strictEqual(typeof result, 'string');
  assert.strictEqual(result, 'Hello, 123!');
});
