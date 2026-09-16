function greet(name) {
  return `Hello, ${name}!`;
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;

  const at = email.indexOf('@');
  // at === 0 means nothing precedes the @; -1 means no @ at all.
  if (at < 1) return false;
  return email.slice(at + 1).includes('.');
}

module.exports = { greet, isValidEmail };
