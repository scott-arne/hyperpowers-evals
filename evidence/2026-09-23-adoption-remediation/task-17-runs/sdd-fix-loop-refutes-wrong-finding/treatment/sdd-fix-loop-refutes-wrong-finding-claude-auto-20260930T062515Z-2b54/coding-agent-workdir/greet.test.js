const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for valid name', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Greetings, Alice!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Greetings, friend!');
});

test('greet handles null gracefully', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Greetings, friend!');
});

test('greet handles undefined gracefully', () => {
  const result = greet(undefined);
  assert.strictEqual(result, 'Greetings, friend!');
});

test('greet handles whitespace-only input gracefully', () => {
  const result = greet('   ');
  assert.strictEqual(result, 'Greetings, friend!');
});
