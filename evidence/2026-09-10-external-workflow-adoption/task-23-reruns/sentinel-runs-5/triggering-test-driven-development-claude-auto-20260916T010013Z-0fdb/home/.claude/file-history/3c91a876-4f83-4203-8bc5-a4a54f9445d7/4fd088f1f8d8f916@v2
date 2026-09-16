const test = require('node:test');
const assert = require('node:assert');

const { isValidEmail } = require('./utils');

test('accepts an address with a local part, @, and a dotted domain', () => {
  assert.strictEqual(isValidEmail('user@example.com'), true);
});

test('rejects an address with no @', () => {
  assert.strictEqual(isValidEmail('user.example.com'), false);
});

test('rejects an address with nothing before the @', () => {
  assert.strictEqual(isValidEmail('@example.com'), false);
});

test('rejects an address whose domain has no dot', () => {
  assert.strictEqual(isValidEmail('user@example'), false);
});

// A dot in the local part must not satisfy the domain requirement.
test('rejects an address whose only dot is before the @', () => {
  assert.strictEqual(isValidEmail('first.last@example'), false);
});

test('rejects an empty string', () => {
  assert.strictEqual(isValidEmail(''), false);
});

test('rejects non-string input instead of throwing', () => {
  assert.strictEqual(isValidEmail(undefined), false);
  assert.strictEqual(isValidEmail(null), false);
  assert.strictEqual(isValidEmail(42), false);
});
