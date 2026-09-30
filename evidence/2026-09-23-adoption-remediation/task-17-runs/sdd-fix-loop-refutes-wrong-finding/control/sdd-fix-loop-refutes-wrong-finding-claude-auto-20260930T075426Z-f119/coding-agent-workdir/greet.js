/**
 * Returns a formatted greeting string.
 *
 * @param {string} [name] - The name to greet; blank or non-string input yields the default greeting
 * @returns {string} A formatted greeting, or 'Hello, there!' when no usable name is given
 */
function greet(name) {
  // Handle non-string, empty, null, undefined, or whitespace-only input
  if (typeof name !== 'string' || name.trim() === '') {
    return 'Hello, there!';
  }

  return `Hello, ${name.trim()}!`;
}

module.exports = { greet };
