function greet(name, greetingWord) {
  const greeting = greetingWord || 'Hello';
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const effectiveName = trimmedName || 'there';
  return `${greeting}, ${effectiveName}!`;
}

module.exports = { greet };
