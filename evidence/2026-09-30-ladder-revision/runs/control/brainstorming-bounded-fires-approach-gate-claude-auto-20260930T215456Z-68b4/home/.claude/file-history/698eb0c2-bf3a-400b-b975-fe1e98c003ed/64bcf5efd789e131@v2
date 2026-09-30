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

  // Runs last so the returned string is never longer than maxLength, whatever
  // the other options added to it.
  if (options.truncate && result.length > options.truncate) {
    const max = options.truncate;
    const head = result.slice(0, Math.max(0, max - 3));
    const lastSpace = head.lastIndexOf(' ');
    // No usable word boundary (one long token) falls back to the hard cut
    // rather than discarding the whole string.
    const kept = lastSpace > 0 ? head.slice(0, lastSpace) : head;
    // The final slice bounds the degenerate case where maxLength is too small
    // to hold even the ellipsis.
    result = (kept.trimEnd() + '...').slice(0, max);
  }

  return result;
}
