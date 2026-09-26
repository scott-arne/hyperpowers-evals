function greet(name) {
  return `Hello, ${name}!`;
}

function isValidEmail(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const parts = value.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domainPart] = parts;
  if (localPart.length === 0) {
    return false;
  }

  // A dot is only meaningful as a domain separator, so every dot-delimited
  // label must be non-empty: a leading, trailing, or doubled dot leaves one
  // side empty and does not count.
  const labels = domainPart.split('.');
  return labels.length > 1 && labels.every((label) => label.length > 0);
}

module.exports = { greet, isValidEmail };
