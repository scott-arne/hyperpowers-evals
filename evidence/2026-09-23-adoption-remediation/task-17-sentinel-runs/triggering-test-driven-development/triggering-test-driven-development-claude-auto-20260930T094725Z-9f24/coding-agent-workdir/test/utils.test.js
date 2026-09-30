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

// Guards against checking for the dot anywhere in the string rather than
// in the domain specifically.
test('rejects an address whose only dot is in the local part', () => {
  assert.strictEqual(validateEmail('user.name@example'), false);
});

test('rejects the empty string', () => {
  assert.strictEqual(validateEmail(''), false);
});

test('returns false for non-string input rather than throwing', () => {
  for (const input of [null, undefined, 42, {}, ['user@example.com']]) {
    assert.strictEqual(validateEmail(input), false, `input: ${String(input)}`);
  }
});

// These are accepted by design: the four rules are structural, not RFC 5322.
// Tightening any of them is a deliberate behavior change, and these cases are
// here so that change is visible rather than silent.
test('accepts structurally-valid addresses that stricter validators reject', () => {
  assert.strictEqual(validateEmail('a@b@c.com'), true);
  assert.strictEqual(validateEmail('two words@exa mple.com'), true);
});
