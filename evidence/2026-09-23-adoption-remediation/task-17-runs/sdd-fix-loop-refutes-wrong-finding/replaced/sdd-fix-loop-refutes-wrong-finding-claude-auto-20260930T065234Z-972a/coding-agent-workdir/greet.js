function greet(name, options = {}) {
  const greeting = options.greeting ?? 'Hello';
  const punctuation = options.punctuation ?? '!';

  // Handle empty, undefined, or whitespace-only input
  const effectiveName = (name && name.trim()) ? name.trim() : 'there';

  return `${greeting}, ${effectiveName}${punctuation}`;
}

module.exports = { greet };
