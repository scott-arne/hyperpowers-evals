function greet(name) {
  if (!name || name === '') {
    return 'Hello, there!';
  }
  return `Hello, ${name}!`;
}

module.exports = { greet };
