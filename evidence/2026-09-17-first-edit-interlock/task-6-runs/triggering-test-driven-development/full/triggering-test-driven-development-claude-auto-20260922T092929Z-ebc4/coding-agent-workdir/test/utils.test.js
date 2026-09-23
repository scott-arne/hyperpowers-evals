const test = require('node:test');
const assert = require('node:assert');

const { isValidEmail } = require('../src/utils');

test('accepts a simple valid address', () => {
  assert.strictEqual(isValidEmail('a@b.co'), true);
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

test('rejects a domain starting with a dot', () => {
  assert.strictEqual(isValidEmail('user@.com'), false);
});

test('rejects a domain ending with a dot', () => {
  assert.strictEqual(isValidEmail('user@example.'), false);
});

test('accepts a multi-level domain', () => {
  assert.strictEqual(isValidEmail('first.last@sub.example.com'), true);
});

test('rejects an address with more than one @', () => {
  assert.strictEqual(isValidEmail('user@host@example.com'), false);
});

test('rejects an empty string', () => {
  assert.strictEqual(isValidEmail(''), false);
});

test('rejects non-string input without throwing', () => {
  assert.strictEqual(isValidEmail(undefined), false);
  assert.strictEqual(isValidEmail(null), false);
  assert.strictEqual(isValidEmail(42), false);
  assert.strictEqual(isValidEmail({}), false);
});
