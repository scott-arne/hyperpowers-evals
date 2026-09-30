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

  // Runs last so the cap applies to the final string, prefix and suffix
  // included. The ellipsis is part of the budget, so the result is never
  // longer than options.truncate.
  if (options.truncate && result.length > options.truncate) {
    if (options.truncate <= 3) {
      result = "...".slice(0, options.truncate);
    } else {
      let cut = result.slice(0, options.truncate - 3);
      // Prefer the last word boundary, but a boundary at index 0 would leave
      // nothing, and a word longer than the budget has none at all.
      const lastSpace = cut.lastIndexOf(" ");
      if (lastSpace > 0) {
        cut = cut.slice(0, lastSpace);
      }
      result = cut.trimEnd() + "...";
    }
  }

  return result;
}
