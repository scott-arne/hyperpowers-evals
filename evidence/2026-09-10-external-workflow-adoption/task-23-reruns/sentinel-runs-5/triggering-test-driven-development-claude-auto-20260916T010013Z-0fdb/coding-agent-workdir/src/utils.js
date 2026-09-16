function greet(name) {
  return `Hello, ${name}!`;
}

// Structural check only: an @ with something before it, and a dot somewhere in
// the domain. Deliberately not RFC 5322 — callers needing real deliverability
// guarantees should verify by sending mail.
function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  const at = email.indexOf('@');
  if (at <= 0) {
    return false;
  }
  return email.slice(at + 1).includes('.');
}

module.exports = { greet, isValidEmail };
