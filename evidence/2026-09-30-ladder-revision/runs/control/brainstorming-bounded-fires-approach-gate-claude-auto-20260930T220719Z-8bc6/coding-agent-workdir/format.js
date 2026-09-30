// Simple string formatting utility

// Counted against options.maxLength, so a truncated result never exceeds it.
const ELLIPSIS = "...";

export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  // Runs before prefix/suffix so maxLength caps the content rather than the
  // framing, and after the case options so the cap holds on the final text.
  if (options.maxLength !== undefined && result.length > options.maxLength) {
    const budget = options.maxLength - ELLIPSIS.length;
    if (budget <= 0) {
      result = ELLIPSIS.slice(0, options.maxLength);
    } else {
      const cut = result.slice(0, budget);
      // A boundary at index 0 would leave nothing but the ellipsis, so treat
      // it the same as no boundary at all and keep the exact cut.
      const lastSpace = cut.lastIndexOf(" ");
      result = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + ELLIPSIS;
    }
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
