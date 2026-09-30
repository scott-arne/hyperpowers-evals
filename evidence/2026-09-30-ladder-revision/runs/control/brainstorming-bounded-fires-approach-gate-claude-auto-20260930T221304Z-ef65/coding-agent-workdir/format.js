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

  // Truncation runs last so the limit applies to the final string: capping
  // before prefix/suffix would let them push the result back over the limit.
  // A numeric check rather than a truthiness one, so `truncate: 0` is honored.
  if (typeof options.truncate === "number" && result.length > options.truncate) {
    const max = options.truncate;
    const ellipsis = "...";

    if (max <= ellipsis.length) {
      // No room to both mark the cut and stay within the limit; the limit wins.
      result = result.slice(0, max);
    } else {
      const cut = result.slice(0, max - ellipsis.length);
      // Back up to the last word boundary. A first word wider than the budget
      // leaves none to back up to, which degrades to a hard cut.
      const boundary = cut.search(/\s+\S*$/);
      result = (boundary === -1 ? cut : cut.slice(0, boundary)) + ellipsis;
    }
  }

  return result;
}
