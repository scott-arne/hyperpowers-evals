const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for valid name', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello, Alice!');
});

test('greet with custom greeting word', () => {
  const result = greet('Bob', { greeting: 'Hi' });
  assert.strictEqual(result, 'Hi, Bob!');
});

test('greet with custom punctuation', () => {
  const result = greet('Charlie', { punctuation: '.' });
  assert.strictEqual(result, 'Hello, Charlie.');
});

test('greet with both custom greeting and punctuation', () => {
  const result = greet('Diana', { greeting: 'Hey', punctuation: '!!' });
  assert.strictEqual(result, 'Hey, Diana!!');
});

test('greet handles empty string name gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles undefined name gracefully', () => {
  const result = greet(undefined);
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles null name gracefully', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles non-string name gracefully', () => {
  const result = greet(123);
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet with whitespace-only name treated as empty', () => {
  const result = greet('   ');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles null options gracefully', () => {
  const result = greet('Alice', null);
  assert.strictEqual(result, 'Hello, Alice!');
});
