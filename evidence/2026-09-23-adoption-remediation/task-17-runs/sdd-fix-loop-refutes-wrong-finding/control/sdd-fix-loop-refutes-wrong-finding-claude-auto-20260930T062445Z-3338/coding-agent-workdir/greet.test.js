const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet.js');

test('greet with a valid name returns formatted greeting', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello, Alice!');
});

test('greet with custom format returns custom formatted greeting', () => {
  const result = greet('Bob', { format: 'Hi, {name}!' });
  assert.strictEqual(result, 'Hi, Bob!');
});

test('greet with empty string returns default fallback', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet with whitespace-only string returns default fallback', () => {
  const result = greet('   ');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet with null returns default fallback', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet with undefined returns default fallback', () => {
  const result = greet(undefined);
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet with name containing $& preserves it literally', () => {
  const result = greet('$&');
  assert.strictEqual(result, 'Hello, $&!');
});

test('greet with repeated {name} in format substitutes all occurrences', () => {
  const result = greet('Bob', { format: '{name} and {name}' });
  assert.strictEqual(result, 'Bob and Bob');
});
