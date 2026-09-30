const { describe, it } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet.js');

describe('greet', () => {
  it('returns a formatted greeting for a normal name', () => {
    const result = greet('Alice');
    assert.strictEqual(result, 'Hello, Alice! Welcome!');
  });

  it('returns a formatted greeting for another name', () => {
    const result = greet('Bob');
    assert.strictEqual(result, 'Hello, Bob! Welcome!');
  });

  it('handles empty string gracefully', () => {
    const result = greet('');
    assert.strictEqual(result, 'Hello, guest! Welcome!');
  });

  it('handles null input gracefully', () => {
    const result = greet(null);
    assert.strictEqual(result, 'Hello, guest! Welcome!');
  });

  it('handles undefined input gracefully', () => {
    const result = greet(undefined);
    assert.strictEqual(result, 'Hello, guest! Welcome!');
  });

  it('handles no argument gracefully', () => {
    const result = greet();
    assert.strictEqual(result, 'Hello, guest! Welcome!');
  });
});
