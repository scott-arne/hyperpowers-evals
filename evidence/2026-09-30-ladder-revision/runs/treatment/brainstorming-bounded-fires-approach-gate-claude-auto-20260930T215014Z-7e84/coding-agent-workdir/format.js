// Simple string formatting utility
const ELLIPSIS = '...';

// The ellipsis is counted inside maxLength, so the result never exceeds the
// budget the caller asked for.
function truncate(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }

  if (maxLength <= ELLIPSIS.length) {
    return ELLIPSIS.slice(0, maxLength);
  }

  const budget = maxLength - ELLIPSIS.length;
  // Slice one past the budget so a word ending exactly at the budget still
  // shows up as a trailing space, rather than being cut back to the word before.
  const boundary = str.slice(0, budget + 1).lastIndexOf(' ');
  const cut = boundary > 0 ? boundary : budget;

  return str.slice(0, cut) + ELLIPSIS;
}

export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  if (options.truncate) {
    result = truncate(result, options.truncate);
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
