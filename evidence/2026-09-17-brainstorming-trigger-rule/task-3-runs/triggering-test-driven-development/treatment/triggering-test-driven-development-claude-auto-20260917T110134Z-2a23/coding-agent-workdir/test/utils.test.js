const test = require('node:test');
const assert = require('node:assert');

const { isValidEmail } = require('../src/utils');

test('accepts a well-formed email address', () => {
  assert.strictEqual(isValidEmail('user@example.com'), true);
});

test('rejects an address with no @ symbol', () => {
  assert.strictEqual(isValidEmail('user.example.com'), false);
});

test('rejects an address with nothing before the @', () => {
  assert.strictEqual(isValidEmail('@example.com'), false);
});

test('rejects an address whose domain has no dot', () => {
  assert.strictEqual(isValidEmail('user@example'), false);
});

// The dot must be in the domain, so one in the local part alone is not enough.
test('rejects an address whose only dot is before the @', () => {
  assert.strictEqual(isValidEmail('first.last@example'), false);
});

test('rejects the empty string', () => {
  assert.strictEqual(isValidEmail(''), false);
});

// The contract is to return a boolean, so non-string input must not throw.
test('rejects non-string input', () => {
  assert.strictEqual(isValidEmail(undefined), false);
  assert.strictEqual(isValidEmail(null), false);
  assert.strictEqual(isValidEmail(42), false);
});
