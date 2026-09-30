// Simple string formatting utility
const ELLIPSIS = "...";

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

  // Truncation runs last so that maxLength bounds the value actually
  // returned. Applying it before prefix/suffix would let those push the
  // result back over the limit.
  if (options.maxLength != null && result.length > options.maxLength) {
    const budget = Math.max(0, options.maxLength);

    if (budget <= ELLIPSIS.length) {
      // Too narrow to spend on an ellipsis, which would carry less
      // information here than the characters it displaces.
      result = result.slice(0, budget);
    } else {
      const head = result.slice(0, budget - ELLIPSIS.length);
      // Match the final whitespace run together with the partial word after
      // it, so cutting at its start drops both. -1 means the budget holds no
      // whitespace at all, and the hard cut stands.
      const boundary = head.search(/\s+\S*$/);
      result = (boundary === -1 ? head : head.slice(0, boundary)) + ELLIPSIS;
    }
  }

  return result;
}
