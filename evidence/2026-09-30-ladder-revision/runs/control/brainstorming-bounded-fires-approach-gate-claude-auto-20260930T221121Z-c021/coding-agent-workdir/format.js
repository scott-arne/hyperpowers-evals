// Simple string formatting utility
export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  // Truncate before the decorators so an explicitly requested prefix or
  // suffix is never the thing that gets cut off.
  if (typeof options.maxLength === "number" && result.length > options.maxLength) {
    // The ellipsis is spent from the budget, so maxLength is a real guarantee.
    const hardCut = result.slice(0, Math.max(0, options.maxLength - 3));
    const lastSpace = hardCut.lastIndexOf(" ");
    // A window with no word boundary would leave nothing but the ellipsis,
    // so fall back to cutting mid-word.
    const body = lastSpace > 0 ? hardCut.slice(0, lastSpace).trimEnd() : hardCut;
    result = (body + "...").slice(0, options.maxLength);
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
