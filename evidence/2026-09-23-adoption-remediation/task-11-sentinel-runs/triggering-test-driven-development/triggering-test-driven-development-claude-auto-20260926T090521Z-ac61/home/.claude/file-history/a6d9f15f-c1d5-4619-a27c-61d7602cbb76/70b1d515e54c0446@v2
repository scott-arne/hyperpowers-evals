const test = require('node:test');
const assert = require('node:assert');

const { isValidEmail } = require('../src/utils');

test('accepts a well-formed address', () => {
  assert.strictEqual(isValidEmail('user@example.com'), true);
});

test('rejects an address with no @ symbol', () => {
  assert.strictEqual(isValidEmail('user.example.com'), false);
});

test('rejects an address with nothing before the @', () => {
  assert.strictEqual(isValidEmail('@example.com'), false);
});

test('rejects a domain with no dot', () => {
  assert.strictEqual(isValidEmail('user@example'), false);
});

test('ignores dots in the local part when looking for the domain dot', () => {
  assert.strictEqual(isValidEmail('first.last@example'), false);
});

test('rejects an address with more than one @', () => {
  assert.strictEqual(isValidEmail('user@host.net@example.com'), false);
});

test('rejects a domain that starts with a dot', () => {
  assert.strictEqual(isValidEmail('user@.com'), false);
});

test('rejects a domain that ends with a dot', () => {
  assert.strictEqual(isValidEmail('user@example.'), false);
});

test('rejects a multi-dot domain that ends with a dot', () => {
  assert.strictEqual(isValidEmail('user@mail.example.'), false);
});

test('accepts a subdomain address', () => {
  assert.strictEqual(isValidEmail('user@mail.example.com'), true);
});

test('returns false for non-string input instead of throwing', () => {
  assert.strictEqual(isValidEmail(undefined), false);
  assert.strictEqual(isValidEmail(null), false);
  assert.strictEqual(isValidEmail(42), false);
});
