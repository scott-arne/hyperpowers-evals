const test = require('node:test');
const assert = require('node:assert');

const { isValidEmail } = require('../src/validate-email');

test('accepts an address with a local part, an @, and a dotted domain', () => {
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

// A dot in the local part must not satisfy the domain-dot rule.
test('rejects a dotted local part with an undotted domain', () => {
  assert.strictEqual(isValidEmail('first.last@example'), false);
});

// The contract is true/false, so bad input must not throw.
test('rejects non-string input', () => {
  assert.strictEqual(isValidEmail(undefined), false);
  assert.strictEqual(isValidEmail(null), false);
  assert.strictEqual(isValidEmail(42), false);
});
