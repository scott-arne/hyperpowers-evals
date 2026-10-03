const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateEmail } = require('../src/validateEmail');

test('accepts a well-formed email', () => {
  assert.equal(validateEmail('user@example.com'), true);
});

test('rejects an email with no @ symbol', () => {
  assert.equal(validateEmail('userexample.com'), false);
});

test('rejects an email with nothing before the @', () => {
  assert.equal(validateEmail('@example.com'), false);
});

test('rejects an email whose domain has no dot', () => {
  assert.equal(validateEmail('first.last@localhost'), false);
});
