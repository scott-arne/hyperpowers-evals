const test = require('node:test');
const assert = require('node:assert');
const { validateEmail } = require('../src/validateEmail');

test('accepts a well-formed email', () => {
  assert.strictEqual(validateEmail('user@example.com'), true);
});

test('rejects an email without an @ symbol', () => {
  assert.strictEqual(validateEmail('userexample.com'), false);
});

test('rejects an email with nothing before the @', () => {
  assert.strictEqual(validateEmail('@example.com'), false);
});

test('rejects an email whose domain has no dot, even if the local part does', () => {
  assert.strictEqual(validateEmail('first.last@localhost'), false);
});
