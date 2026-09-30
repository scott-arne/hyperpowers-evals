function greet(name, options = {}) {
  const greeting = options.greeting || 'Hello';
  const displayName = name || 'there';
  return `${greeting}, ${displayName}!`;
}

module.exports = { greet };
