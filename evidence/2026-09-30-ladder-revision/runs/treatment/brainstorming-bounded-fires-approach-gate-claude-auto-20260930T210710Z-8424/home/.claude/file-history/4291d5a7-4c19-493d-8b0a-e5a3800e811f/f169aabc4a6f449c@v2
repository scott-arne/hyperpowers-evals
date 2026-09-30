// Simple string formatting utility
export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  // Runs before prefix/suffix so caller-supplied chrome always survives the cut.
  if (options.truncate && result.length > options.truncate) {
    const ellipsis = "...";
    const budget = options.truncate - ellipsis.length;

    if (budget <= 0) {
      result = ellipsis.slice(0, options.truncate);
    } else {
      const cut = result.slice(0, budget);
      // Back off to the last word boundary, but only when one exists inside the
      // budget -- a single long word has none, and must still be cut somewhere.
      const boundary = cut.lastIndexOf(" ");
      result = (boundary > 0 ? cut.slice(0, boundary) : cut).trimEnd() + ellipsis;
    }
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
