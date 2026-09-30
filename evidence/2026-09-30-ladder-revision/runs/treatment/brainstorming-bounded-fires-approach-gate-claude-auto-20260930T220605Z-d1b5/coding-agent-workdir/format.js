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

  // Truncation runs last so maxLength bounds what the caller actually gets;
  // truncating before prefix/suffix would let those push the result back over.
  if (options.maxLength !== undefined && result.length > options.maxLength) {
    const ellipsis = "...";

    if (options.maxLength <= ellipsis.length) {
      result = ellipsis.slice(0, Math.max(0, options.maxLength));
    } else {
      const budget = result.slice(0, options.maxLength - ellipsis.length);
      // Prefer the last word boundary. A budget with no whitespace is a single
      // unbroken word, which leaves no choice but a hard cut.
      const boundary = budget.search(/\s+\S*$/);
      const kept = boundary === -1 ? budget : budget.slice(0, boundary);
      result = kept + ellipsis;
    }
  }

  return result;
}
