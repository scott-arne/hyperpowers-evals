// Simple string formatting utility
export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  // Runs before prefix/suffix so truncate bounds the string being formatted.
  // Truncating the assembled result would silently discard a prefix or suffix
  // the caller explicitly asked for, which is worse than exceeding the limit.
  if (options.truncate && result.length > options.truncate) {
    const ellipsis = "...";
    const budget = options.truncate - ellipsis.length;

    if (budget <= 0) {
      result = ellipsis.slice(0, options.truncate);
    } else {
      const head = result.slice(0, budget);
      const atWordBoundary = head.replace(/\s+\S*$/, "");
      // Hard cut when the budget holds no usable word boundary.
      result = (atWordBoundary || head.trimEnd()) + ellipsis;
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
