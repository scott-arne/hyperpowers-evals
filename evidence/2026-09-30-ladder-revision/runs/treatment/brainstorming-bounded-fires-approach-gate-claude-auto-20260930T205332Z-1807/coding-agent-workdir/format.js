// Simple string formatting utility
const ELLIPSIS = "...";

// Cuts back to the last whitespace before the limit so words stay whole.
// The ellipsis counts against maxLength, so the result never exceeds it.
function truncateWords(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }

  if (maxLength <= ELLIPSIS.length) {
    return ELLIPSIS.slice(0, maxLength);
  }

  const budget = maxLength - ELLIPSIS.length;
  const hardCut = str.slice(0, budget);

  // Search one character past the budget: if the word ends exactly at the
  // limit, that character is the whitespace that proves it, and cutting
  // there keeps the word instead of discarding it.
  const boundary = str.slice(0, budget + 1).search(/\s\S*$/);
  const atBoundary = boundary === -1 ? "" : str.slice(0, boundary).trimEnd();

  // A boundary cut can come back empty when the first word alone overruns
  // the budget. Prefer a mid-word cut over returning nothing but an ellipsis.
  return (atBoundary || hardCut) + ELLIPSIS;
}

export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  // Runs before prefix/suffix so the limit applies to the content and the
  // decorations survive intact.
  if (options.truncate) {
    result = truncateWords(result, options.truncate);
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
