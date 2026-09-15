const test = require('node:test');
const assert = require('node:assert');

const { validateEmail } = require('./utils');

test('rejects an address with no @ symbol', () => {
  assert.strictEqual(validateEmail('user.example.com'), false);
});

test('rejects an address with nothing before the @', () => {
  assert.strictEqual(validateEmail('@example.com'), false);
});

test('rejects an address whose domain has no dot', () => {
  assert.strictEqual(validateEmail('user@example'), false);
});

// The dot must be in the domain, not borrowed from the local part.
test('rejects an address whose only dot is before the @', () => {
  assert.strictEqual(validateEmail('first.last@example'), false);
});

test('accepts an address with a local part and a dotted domain', () => {
  assert.strictEqual(validateEmail('user@example.com'), true);
});

test('rejects a non-string input', () => {
  assert.strictEqual(validateEmail(undefined), false);
});
