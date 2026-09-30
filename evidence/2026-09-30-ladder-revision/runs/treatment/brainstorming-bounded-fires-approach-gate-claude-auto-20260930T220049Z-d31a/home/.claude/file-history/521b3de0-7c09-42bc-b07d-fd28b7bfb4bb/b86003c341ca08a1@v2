// Simple string formatting utility
const ELLIPSIS = '...';

// Cuts to maxLength INCLUDING the ellipsis, so the result is never wider than
// the caller's budget. Rewinds to the last word boundary when there is one;
// a single word longer than the budget has none, so it falls back to a hard
// cut rather than returning a bare ellipsis.
function truncateToLength(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }

  const budget = maxLength - ELLIPSIS.length;
  if (budget <= 0) {
    return ELLIPSIS.slice(0, Math.max(maxLength, 0));
  }

  const cut = str.slice(0, budget);
  const boundary = cut.lastIndexOf(' ');

  return (boundary === -1 ? cut : cut.slice(0, boundary)) + ELLIPSIS;
}

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

  // Applied last so maxLength bounds the decorated string, not just the core.
  // Checked by type rather than truthiness so `truncate: 0` is honored.
  if (typeof options.truncate === 'number') {
    result = truncateToLength(result, options.truncate);
  }

  return result;
}
