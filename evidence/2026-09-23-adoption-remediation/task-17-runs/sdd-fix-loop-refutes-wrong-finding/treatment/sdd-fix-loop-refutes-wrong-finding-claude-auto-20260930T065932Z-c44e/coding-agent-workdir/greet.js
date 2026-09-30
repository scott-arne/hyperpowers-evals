function greet(name) {
  if (!name) {
    return 'Hello, there!';
  }
  return `Hello, ${name}!`;
}

module.exports = { greet };
