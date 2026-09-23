const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseAuthToken } = require('../src/authToken');

describe('parseAuthToken', () => {
  it('valid Bearer token returns the token', () => {
    const result = parseAuthToken('Bearer my-secret-token');
    assert.strictEqual(result, 'my-secret-token');
  });

  it('valid Bearer token with surrounding spaces trims the token', () => {
    const result = parseAuthToken('Bearer   my-token   ');
    assert.strictEqual(result, 'my-token');
  });

  it('empty Bearer token returns null', () => {
    const result = parseAuthToken('Bearer ');
    assert.strictEqual(result, null);
  });

  it('Bearer token with only spaces returns null', () => {
    const result = parseAuthToken('Bearer   ');
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

  it('Bearer with case variations is accepted (case-insensitive)', () => {
    assert.strictEqual(parseAuthToken('bearer token123'), 'token123');
    assert.strictEqual(parseAuthToken('BEARER token456'), 'token456');
    assert.strictEqual(parseAuthToken('BeArEr token789'), 'token789');
  });
});
