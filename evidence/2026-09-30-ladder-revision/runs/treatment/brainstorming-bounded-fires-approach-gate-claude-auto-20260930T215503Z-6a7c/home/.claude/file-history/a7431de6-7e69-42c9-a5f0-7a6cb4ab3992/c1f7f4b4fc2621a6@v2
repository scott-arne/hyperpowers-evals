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

  // Truncation runs last so maxLength bounds the final output, ellipsis included.
  if (options.maxLength !== undefined && result.length > options.maxLength) {
    const ellipsis = "...";
    const budget = options.maxLength - ellipsis.length;

    if (budget <= 0) {
      // No room for content, and possibly not for the whole ellipsis either.
      return ellipsis.slice(0, options.maxLength);
    }

    // Search one character past the budget so a cut landing exactly on a space
    // counts as a clean word break rather than backing off to the prior word.
    const boundary = result.slice(0, budget + 1).lastIndexOf(" ");
    const cut = boundary === -1 ? budget : boundary;
    result = result.slice(0, cut).trimEnd() + ellipsis;
  }

  return result;
}
