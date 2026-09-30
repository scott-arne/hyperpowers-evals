const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting with name', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello, Alice!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles missing argument gracefully', () => {
  const result = greet();
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles whitespace-only name gracefully', () => {
  const result = greet('   ');
  assert.strictEqual(result, 'Hello, there!');
});

test('greet supports custom greeting word', () => {
  const result = greet('Bob', 'Hi');
  assert.strictEqual(result, 'Hi, Bob!');
});

test('greet trims whitespace from name', () => {
  const result = greet('  Charlie  ');
  assert.strictEqual(result, 'Hello, Charlie!');
});
