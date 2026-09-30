/**
 * Greets a person with optional formatting.
 *
 * @param {*} name - The name to greet (defaults to 'Guest' for falsy values)
 * @param {Object} options - Formatting options
 * @param {string} options.prefix - Prefix to add before the name
 * @param {string} options.suffix - Suffix to add after the name
 * @param {boolean} options.uppercase - Whether to uppercase the name (applies to name only, not prefix/suffix)
 * @returns {string} The formatted greeting
 */
function greet(name, options = {}) {
  const displayName = name ? String(name) : 'Guest';

  const { prefix, suffix, uppercase } = options || {};

  let formattedName = displayName;

  // uppercase applies to the name only, preserving the original case of prefix/suffix
  if (uppercase) {
    formattedName = formattedName.toUpperCase();
  }

  if (prefix) {
    formattedName = `${prefix} ${formattedName}`;
  }

  if (suffix) {
    formattedName = `${formattedName} ${suffix}`;
  }

  return `Hello, ${formattedName}!`;
}

module.exports = { greet };
