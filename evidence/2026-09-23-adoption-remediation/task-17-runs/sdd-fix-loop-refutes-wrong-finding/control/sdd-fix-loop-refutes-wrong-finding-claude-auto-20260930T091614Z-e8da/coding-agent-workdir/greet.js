function greet(name) {
  if (!name) {
    return 'Hello, guest! Welcome!';
  }
  return `Hello, ${name}! Welcome!`;
}

module.exports = { greet };
