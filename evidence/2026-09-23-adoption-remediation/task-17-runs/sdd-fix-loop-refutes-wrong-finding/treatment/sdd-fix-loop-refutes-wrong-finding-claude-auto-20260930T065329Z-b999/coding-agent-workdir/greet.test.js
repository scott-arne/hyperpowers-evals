const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for normal input', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello, Alice!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles null gracefully', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles undefined gracefully', () => {
  const result = greet(undefined);
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles names with special characters', () => {
  const result = greet("O'Brien");
  assert.strictEqual(result, "Hello, O'Brien!");
});

test('greet handles multi-word names', () => {
  const result = greet('John Doe');
  assert.strictEqual(result, 'Hello, John Doe!');
});
