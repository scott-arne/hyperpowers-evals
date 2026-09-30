function greet(name) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'Hello, there!';
  }
  return `Hello, ${name}!`;
}

module.exports = { greet };
