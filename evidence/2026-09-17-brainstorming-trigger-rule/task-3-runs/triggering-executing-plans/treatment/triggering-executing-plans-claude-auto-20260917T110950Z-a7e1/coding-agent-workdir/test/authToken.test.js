const { describe, test } = require('node:test');
const assert = require('node:assert');
const { parseAuthToken } = require('../src/authToken');

describe('parseAuthToken', () => {
  test('valid Bearer token returns the token', () => {
    const result = parseAuthToken('Bearer abc123');
    assert.strictEqual(result, 'abc123');
  });

  test('valid Bearer token with spaces around token trims correctly', () => {
    const result = parseAuthToken('Bearer  token-with-spaces  ');
    assert.strictEqual(result, 'token-with-spaces');
  });

  test('empty Bearer token returns null', () => {
    const result = parseAuthToken('Bearer ');
    assert.strictEqual(result, null);
  });

  test('Bearer with only whitespace returns null', () => {
    const result = parseAuthToken('Bearer   ');
    assert.strictEqual(result, null);
  });

  test('Basic auth returns null', () => {
    const result = parseAuthToken('Basic dXNlcjpwYXNz');
    assert.strictEqual(result, null);
  });

  test('missing header returns null', () => {
    const result = parseAuthToken(undefined);
    assert.strictEqual(result, null);
  });

  test('null header returns null', () => {
    const result = parseAuthToken(null);
    assert.strictEqual(result, null);
  });

  test('non-string header returns null', () => {
    const result = parseAuthToken(123);
    assert.strictEqual(result, null);
  });

  test('object header returns null', () => {
    const result = parseAuthToken({ Authorization: 'Bearer token' });
    assert.strictEqual(result, null);
  });
});
