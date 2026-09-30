function greet(name, greeting = 'Hello') {
  // Handle empty, undefined, or whitespace-only names
  const trimmedName = (name || '').trim();
  const displayName = trimmedName || 'Guest';

  return `${greeting}, ${displayName}!`;
}

module.exports = { greet };
