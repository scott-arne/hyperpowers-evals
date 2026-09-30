// Simple string formatting utility
const ELLIPSIS = '...';

// Cuts str down to maxLength characters INCLUDING the ellipsis, so the result
// is never longer than the caller asked for.
function truncate(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }

  // No room for both content and an ellipsis, so the ellipsis is dropped.
  if (maxLength <= ELLIPSIS.length) {
    return str.slice(0, maxLength);
  }

  const candidate = str.slice(0, maxLength - ELLIPSIS.length);
  // Back off to the last whitespace so a word is not cut mid-way. A budget
  // holding no whitespace (a URL, a hash, one long word) has nothing to back
  // off to, and one holding only a leading fragment would back off to nothing;
  // in both cases the hard cut stands.
  const atBoundary = candidate.replace(/\s\S*$/, '');
  const kept = atBoundary.length > 0 ? atBoundary : candidate;

  return kept.trimEnd() + ELLIPSIS;
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

  // Runs last so maxLength caps what is actually returned, prefix and suffix
  // included. Tested for presence rather than truthiness because 0 is a valid
  // cap.
  if (options.maxLength !== undefined) {
    result = truncate(result, options.maxLength);
  }

  return result;
}
