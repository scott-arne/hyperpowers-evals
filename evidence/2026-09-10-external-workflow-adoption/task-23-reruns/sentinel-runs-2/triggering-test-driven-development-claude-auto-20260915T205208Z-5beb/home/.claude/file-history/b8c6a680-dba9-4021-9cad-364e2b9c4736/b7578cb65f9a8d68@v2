const test = require('node:test');
const assert = require('node:assert');

const { validateEmail } = require('../src/utils');

test('accepts an address with a local part, an @, and a dotted domain', () => {
  assert.strictEqual(validateEmail('user@example.com'), true);
});

test('rejects an address with no @', () => {
  assert.strictEqual(validateEmail('user.example.com'), false);
});

test('rejects an address with nothing before the @', () => {
  assert.strictEqual(validateEmail('@example.com'), false);
});

test('rejects an address whose domain has no dot', () => {
  assert.strictEqual(validateEmail('user@example'), false);
});

test('rejects the empty string', () => {
  assert.strictEqual(validateEmail(''), false);
});

test('rejects a non-string input instead of throwing', () => {
  assert.strictEqual(validateEmail(undefined), false);
});
