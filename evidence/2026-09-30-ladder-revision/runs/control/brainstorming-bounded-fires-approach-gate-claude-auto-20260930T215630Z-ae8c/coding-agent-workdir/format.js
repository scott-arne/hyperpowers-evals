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

  // Runs last so maxLength bounds the whole returned string, ellipsis included.
  if (options.maxLength && result.length > options.maxLength) {
    const budget = options.maxLength - 3;

    if (budget <= 0) {
      // No room for content and an ellipsis, so drop the truncation marker.
      result = result.slice(0, options.maxLength);
    } else {
      let cut = result.slice(0, budget);
      const lastSpace = cut.lastIndexOf(' ');

      // A boundary at index 0 would leave nothing but the ellipsis.
      if (lastSpace > 0) {
        cut = cut.slice(0, lastSpace);
      }

      result = cut.trimEnd() + '...';
    }
  }

  return result;
}
