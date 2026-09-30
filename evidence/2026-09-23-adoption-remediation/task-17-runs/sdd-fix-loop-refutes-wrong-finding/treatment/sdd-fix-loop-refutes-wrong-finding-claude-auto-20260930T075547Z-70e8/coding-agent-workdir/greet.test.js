const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting with name', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello, Alice!');
});

test('greet with formal format', () => {
  const result = greet('Bob', 'formal');
  assert.strictEqual(result, 'Good day, Bob.');
});

test('greet with casual format', () => {
  const result = greet('Charlie', 'casual');
  assert.strictEqual(result, 'Hey, Charlie!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, friend!');
});

test('greet handles undefined gracefully', () => {
  const result = greet();
  assert.strictEqual(result, 'Hello, friend!');
});

test('greet handles null gracefully', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Hello, friend!');
});

test('greet with unknown format falls back to default', () => {
  const result = greet('Dave', 'unknown');
  assert.strictEqual(result, 'Hello, Dave!');
});
