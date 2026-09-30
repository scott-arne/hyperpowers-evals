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

  // Runs last so maxLength bounds the string actually returned, prefix and
  // suffix included.
  if (options.maxLength !== undefined && result.length > options.maxLength) {
    result = truncate(result, options.maxLength);
  }

  return result;
}

const ELLIPSIS = "...";

// The ellipsis counts toward maxLength, so the result never exceeds it.
function truncate(str, maxLength) {
  if (maxLength <= ELLIPSIS.length) {
    return ELLIPSIS.slice(0, Math.max(maxLength, 0));
  }

  const budget = maxLength - ELLIPSIS.length;
  // Slice one past the budget so a cut landing exactly on a space still sees
  // that space as the boundary.
  const boundary = str.slice(0, budget + 1).lastIndexOf(" ");
  const kept = boundary > 0 ? str.slice(0, boundary) : str.slice(0, budget);

  return kept.trimEnd() + ELLIPSIS;
}
