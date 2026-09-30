function greet(name) {
  const displayName = name || 'Guest';
  return `Hello, ${displayName}!`;
}

module.exports = { greet };
