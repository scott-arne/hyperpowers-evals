function greet(name) {
  return `Hello, ${name}!`;
}

function validateEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  const atIndex = email.indexOf('@');
  if (atIndex < 1) {
    return false;
  }
  return email.slice(atIndex + 1).includes('.');
}

module.exports = { greet, validateEmail };
