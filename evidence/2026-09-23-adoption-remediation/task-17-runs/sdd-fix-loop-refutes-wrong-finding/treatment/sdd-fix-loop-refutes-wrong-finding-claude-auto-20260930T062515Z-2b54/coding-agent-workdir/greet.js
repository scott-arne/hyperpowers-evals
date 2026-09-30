function greet(name) {
  // Handle empty, null, undefined, or whitespace-only input
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'Greetings, friend!';
  }

  return `Greetings, ${name}!`;
}

module.exports = { greet };
