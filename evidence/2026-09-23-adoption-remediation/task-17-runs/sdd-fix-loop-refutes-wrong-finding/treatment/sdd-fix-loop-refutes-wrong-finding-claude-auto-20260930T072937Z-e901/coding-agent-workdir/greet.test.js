const { describe, it } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

describe('greet', () => {
  it('should return a formatted greeting with a name', () => {
    const result = greet('Alice');
    assert.strictEqual(result, 'Hello, Alice!');
  });

  it('should handle empty input gracefully', () => {
    const result = greet('');
    assert.strictEqual(result, 'Hello, there!');
  });

  it('should handle null input gracefully', () => {
    const result = greet(null);
    assert.strictEqual(result, 'Hello, there!');
  });

  it('should handle undefined input gracefully', () => {
    const result = greet(undefined);
    assert.strictEqual(result, 'Hello, there!');
  });

  it('should support custom greeting word', () => {
    const result = greet('Alice', { greeting: 'Hi' });
    assert.strictEqual(result, 'Hi, Alice!');
  });

  it('should support custom greeting with empty name', () => {
    const result = greet('', { greeting: 'Greetings' });
    assert.strictEqual(result, 'Greetings, there!');
  });
});
