const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for valid name', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello there, Alice!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello there, friend!');
});

test('greet handles undefined input gracefully', () => {
  const result = greet(undefined);
  assert.strictEqual(result, 'Hello there, friend!');
});

test('greet handles null input gracefully', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Hello there, friend!');
});

test('greet handles names with spaces', () => {
  const result = greet('John Doe');
  assert.strictEqual(result, 'Hello there, John Doe!');
});

test('greet handles whitespace-only input gracefully', () => {
  const result = greet('   ');
  assert.strictEqual(result, 'Hello there, friend!');
});
