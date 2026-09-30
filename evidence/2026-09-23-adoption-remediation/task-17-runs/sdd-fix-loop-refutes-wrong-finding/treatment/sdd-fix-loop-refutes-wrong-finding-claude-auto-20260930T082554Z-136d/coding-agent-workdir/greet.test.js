const { describe, it } = require('node:test');
const assert = require('node:assert');
const { greet } = require('./greet');

describe('greet', () => {
  it('returns a greeting with the provided name', () => {
    const result = greet('Alice');
    assert.strictEqual(result, 'Hello, Alice!');
  });

  it('handles empty string gracefully', () => {
    const result = greet('');
    assert.strictEqual(result, 'Hello, friend!');
  });

  it('handles null gracefully', () => {
    const result = greet(null);
    assert.strictEqual(result, 'Hello, friend!');
  });

  it('handles undefined gracefully', () => {
    const result = greet(undefined);
    assert.strictEqual(result, 'Hello, friend!');
  });

  it('supports custom prefix', () => {
    const result = greet('Bob', { prefix: 'Hi' });
    assert.strictEqual(result, 'Hi, Bob!');
  });

  it('supports uppercase formatting', () => {
    const result = greet('Charlie', { uppercase: true });
    assert.strictEqual(result, 'HELLO, CHARLIE!');
  });

  it('supports both custom prefix and uppercase', () => {
    const result = greet('Dave', { prefix: 'Welcome', uppercase: true });
    assert.strictEqual(result, 'WELCOME, DAVE!');
  });

  it('applies uppercase to default friend greeting', () => {
    const result = greet('', { uppercase: true });
    assert.strictEqual(result, 'HELLO, FRIEND!');
  });
});
