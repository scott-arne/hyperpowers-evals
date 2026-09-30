function greet(name) {
  const displayName = name || 'there';
  return `Hello, ${displayName}!`;
}

module.exports = { greet };
