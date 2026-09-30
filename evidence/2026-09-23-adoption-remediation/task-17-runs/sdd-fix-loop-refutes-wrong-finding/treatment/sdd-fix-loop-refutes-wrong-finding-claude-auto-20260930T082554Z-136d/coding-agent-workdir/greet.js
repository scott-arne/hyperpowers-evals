function greet(name, options = {}) {
  const { prefix = 'Hello', uppercase = false } = options;

  // Handle empty input gracefully with a default
  const displayName = (name === null || name === undefined || name === '')
    ? 'friend'
    : name;

  let greeting = `${prefix}, ${displayName}!`;

  if (uppercase) {
    greeting = greeting.toUpperCase();
  }

  return greeting;
}

module.exports = { greet };
