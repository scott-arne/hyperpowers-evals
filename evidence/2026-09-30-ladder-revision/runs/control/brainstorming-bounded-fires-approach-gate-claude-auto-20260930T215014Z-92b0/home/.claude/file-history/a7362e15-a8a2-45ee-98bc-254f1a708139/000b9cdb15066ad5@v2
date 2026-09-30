// Simple string formatting utility
export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  // Truncation runs last so the length bound holds over the final string,
  // prefix and suffix included.
  if (typeof options.truncate === 'number' && result.length > options.truncate) {
    if (options.truncate <= 3) {
      // No room for both text and ellipsis, so clip the ellipsis itself
      // rather than exceed the requested length.
      result = '...'.slice(0, Math.max(0, options.truncate));
    } else {
      const head = result.slice(0, options.truncate - 3);
      const boundary = head.lastIndexOf(' ');
      result = (boundary === -1 ? head : head.slice(0, boundary)).trimEnd() + '...';
    }
  }

  return result;
}
