/**
 * Greet a person by name with optional custom formatting.
 *
 * @param {string} name - The name to greet. Empty/invalid names default to "Guest".
 * @param {Object} options - Optional formatting options.
 * @param {string} options.greeting - Custom greeting word (default: "Hello").
 * @param {string} options.punctuation - Custom punctuation (default: "!").
 * @returns {string} A formatted greeting string.
 *
 * Examples:
 *   greet("Alice") => "Hello, Alice!"
 *   greet("Bob", { greeting: "Hi" }) => "Hi, Bob!"
 *   greet("", { greeting: "Hey" }) => "Hey, Guest!"
 */
function greet(name, options) {
  const opts = options || {};
  const greeting = opts.greeting || 'Hello';
  const punctuation = opts.punctuation || '!';

  // Handle empty, null, undefined, non-string, or whitespace-only names
  const validName = (typeof name === 'string' && name.trim()) ? name : 'Guest';

  return `${greeting}, ${validName}${punctuation}`;
}

module.exports = { greet };
