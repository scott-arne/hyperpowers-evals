// Simple string formatting utility
const ELLIPSIS = '...';

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

  // Runs last so the cap covers the composed string, prefix and suffix
  // included. A number of 0 is meaningful here, so this tests the type
  // rather than truthiness.
  if (typeof options.truncate === 'number' && result.length > options.truncate) {
    const max = options.truncate;

    if (max <= ELLIPSIS.length) {
      result = ELLIPSIS.slice(0, Math.max(0, max));
    } else {
      const candidate = result.slice(0, max - ELLIPSIS.length);
      const lastSpace = candidate.lastIndexOf(' ');
      // A space at index 0 would back off to nothing, so treat it like no
      // boundary at all and keep the hard cut.
      const body = lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;
      result = body.trimEnd() + ELLIPSIS;
    }
  }

  return result;
}
