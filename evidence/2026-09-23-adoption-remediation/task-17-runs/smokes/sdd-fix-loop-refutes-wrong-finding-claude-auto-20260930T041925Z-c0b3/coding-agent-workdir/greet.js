function greet(name) {
  if (name === undefined || name === null || (typeof name === 'string' && name.trim() === '')) {
    return 'Hello, Guest!';
  }
  return `Hello, ${name}!`;
}

module.exports = { greet };
