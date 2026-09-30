const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for normal input', () => {
  assert.strictEqual(greet('Alice'), 'Hello, Alice!');
  assert.strictEqual(greet('Bob'), 'Hello, Bob!');
});

test('greet handles empty input gracefully', () => {
  assert.strictEqual(greet(''), 'Hello, Guest!');
  assert.strictEqual(greet(), 'Hello, Guest!');
  assert.strictEqual(greet('  '), 'Hello, Guest!');
});

test('greet supports custom greeting word', () => {
  assert.strictEqual(greet('Alice', 'Hi'), 'Hi, Alice!');
  assert.strictEqual(greet('Bob', 'Welcome'), 'Welcome, Bob!');
});

test('greet with custom greeting handles empty name', () => {
  assert.strictEqual(greet('', 'Hi'), 'Hi, Guest!');
  assert.strictEqual(greet(undefined, 'Welcome'), 'Welcome, Guest!');
});
