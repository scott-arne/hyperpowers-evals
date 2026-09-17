const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseAuthToken } = require('../src/authToken');

describe('parseAuthToken', () => {
  it('valid Bearer token returns the token', () => {
    const result = parseAuthToken('Bearer abc123');
    assert.strictEqual(result, 'abc123');
  });

  it('valid Bearer token with surrounding spaces returns trimmed token', () => {
    const result = parseAuthToken('Bearer   token-with-spaces  ');
    assert.strictEqual(result, 'token-with-spaces');
  });

  it('empty Bearer token returns null', () => {
    const result = parseAuthToken('Bearer ');
    assert.strictEqual(result, null);
  });

  it('Bearer with only spaces returns null', () => {
    const result = parseAuthToken('Bearer    ');
    assert.strictEqual(result, null);
  });

  it('Basic auth returns null', () => {
    const result = parseAuthToken('Basic dXNlcjpwYXNz');
    assert.strictEqual(result, null);
  });

  it('missing header returns null', () => {
    const result = parseAuthToken(undefined);
    assert.strictEqual(result, null);
  });

  it('null header returns null', () => {
    const result = parseAuthToken(null);
    assert.strictEqual(result, null);
  });

  it('non-string header returns null', () => {
    const result = parseAuthToken(123);
    assert.strictEqual(result, null);
  });

  it('object header returns null', () => {
    const result = parseAuthToken({ auth: 'Bearer token' });
    assert.strictEqual(result, null);
  });
});
