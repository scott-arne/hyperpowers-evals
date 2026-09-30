const test = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

test('greet returns formatted greeting for a name', () => {
  assert.strictEqual(greet('Alice'), 'Welcome, Alice!');
});

test('greet handles empty string gracefully', () => {
  assert.strictEqual(greet(''), 'Welcome, friend!');
});

test('greet handles null gracefully', () => {
  assert.strictEqual(greet(null), 'Welcome, friend!');
});

test('greet handles undefined gracefully', () => {
  assert.strictEqual(greet(undefined), 'Welcome, friend!');
});

test('greet handles whitespace-only input gracefully', () => {
  assert.strictEqual(greet('   '), 'Welcome, friend!');
});

test('greet handles various valid names', () => {
  assert.strictEqual(greet('Bob'), 'Welcome, Bob!');
  assert.strictEqual(greet('Charlie'), 'Welcome, Charlie!');
  assert.strictEqual(greet('Dr. Smith'), 'Welcome, Dr. Smith!');
});
