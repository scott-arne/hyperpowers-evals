/**
 * Check an email address against three structural rules: it contains an @,
 * has at least one character before the @, and has a dot after the @.
 *
 * This is a structural check, not RFC 5322 conformance.
 */
function isValidEmail(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const atIndex = value.indexOf('@');
  if (atIndex < 1) {
    return false;
  }

  return value.slice(atIndex + 1).includes('.');
}

module.exports = { isValidEmail };
