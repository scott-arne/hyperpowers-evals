const test = require('node:test');
const assert = require('node:assert');

const { isValidEmail } = require('../src/utils');

test('accepts an address with a local part and a dotted domain', () => {
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

test('rejects a non-string input instead of throwing', () => {
  assert.strictEqual(isValidEmail(undefined), false);
});
