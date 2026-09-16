function greet(name) {
  return `Hello, ${name}!`;
}

function validateEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }
  // atIndex < 1 covers both "no @ at all" (-1) and "nothing before the @" (0).
  const atIndex = email.indexOf('@');
  if (atIndex < 1) {
    return false;
  }
  // The dot must be in the domain, so only search after the @.
  return email.slice(atIndex + 1).includes('.');
}

module.exports = { greet, validateEmail };
