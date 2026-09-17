function greet(name) {
  return `Hello, ${name}!`;
}

function isValidEmail(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const atIndex = value.indexOf('@');
  if (atIndex <= 0) {
    return false;
  }
  return value.slice(atIndex + 1).includes('.');
}

module.exports = { greet, isValidEmail };
