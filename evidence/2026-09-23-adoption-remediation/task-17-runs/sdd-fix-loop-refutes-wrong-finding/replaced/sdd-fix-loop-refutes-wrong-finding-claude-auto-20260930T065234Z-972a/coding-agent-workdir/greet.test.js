const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting with name', () => {
  assert.strictEqual(greet('Alice'), 'Hello, Alice!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles undefined gracefully', () => {
  const result = greet();
  assert.strictEqual(result, 'Hello, there!');
});

test('greet handles whitespace-only input gracefully', () => {
  const result = greet('   ');
  assert.strictEqual(result, 'Hello, there!');
});

test('greet accepts custom greeting word', () => {
  const result = greet('Alice', { greeting: 'Hi' });
  assert.strictEqual(result, 'Hi, Alice!');
});

test('greet accepts custom punctuation', () => {
  const result = greet('Alice', { punctuation: '.' });
  assert.strictEqual(result, 'Hello, Alice.');
});

test('greet accepts both custom greeting and punctuation', () => {
  const result = greet('Alice', { greeting: 'Hey', punctuation: '!!' });
  assert.strictEqual(result, 'Hey, Alice!!');
});

test('greet accepts empty string punctuation', () => {
  assert.strictEqual(greet('Alice', { punctuation: '' }), 'Hello, Alice');
});

test('greet trims surrounding whitespace from a name', () => {
  assert.strictEqual(greet('  Alice  '), 'Hello, Alice!');
});
