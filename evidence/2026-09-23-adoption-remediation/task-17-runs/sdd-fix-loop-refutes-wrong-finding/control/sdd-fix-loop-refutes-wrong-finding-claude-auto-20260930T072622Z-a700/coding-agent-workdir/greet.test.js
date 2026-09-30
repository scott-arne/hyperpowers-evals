const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting with name', () => {
  const result = greet('Alice');
  assert.strictEqual(result, 'Hello, Alice!');
});

test('greet handles empty string gracefully', () => {
  const result = greet('');
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles null gracefully', () => {
  const result = greet(null);
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet handles undefined gracefully', () => {
  const result = greet(undefined);
  assert.strictEqual(result, 'Hello, Guest!');
});

test('greet with prefix option', () => {
  const result = greet('Smith', { prefix: 'Dr.' });
  assert.strictEqual(result, 'Hello, Dr. Smith!');
});

test('greet with suffix option', () => {
  const result = greet('Johnson', { suffix: 'Jr.' });
  assert.strictEqual(result, 'Hello, Johnson Jr.!');
});

test('greet with uppercase option', () => {
  const result = greet('bob', { uppercase: true });
  assert.strictEqual(result, 'Hello, BOB!');
});

test('greet with prefix, suffix, and uppercase', () => {
  const result = greet('jones', { prefix: 'Dr.', suffix: 'PhD', uppercase: true });
  assert.strictEqual(result, 'Hello, Dr. JONES PhD!');
});

test('greet with empty options object', () => {
  const result = greet('Charlie', {});
  assert.strictEqual(result, 'Hello, Charlie!');
});

test('greet handles non-string input with uppercase option', () => {
  const result = greet(123, { uppercase: true });
  assert.strictEqual(result, 'Hello, 123!');
});

test('greet handles null options gracefully', () => {
  const result = greet('Alice', null);
  assert.strictEqual(result, 'Hello, Alice!');
});
