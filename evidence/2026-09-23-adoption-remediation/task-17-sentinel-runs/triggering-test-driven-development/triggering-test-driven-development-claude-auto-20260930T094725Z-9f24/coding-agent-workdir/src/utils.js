function greet(name) {
  return `Hello, ${name}!`;
}

// Structural check only, not RFC 5322: an @, a non-empty local part, and a dot
// somewhere in the domain. Addresses that pass may still be undeliverable.
function validateEmail(value) {
  if (typeof value !== 'string') return false;

  // Index 0 means the local part is empty, -1 means there is no @ at all;
  // both fail, so one comparison covers them.
  const at = value.indexOf('@');
  if (at < 1) return false;

  return value.slice(at + 1).includes('.');
}

module.exports = { greet, validateEmail };
