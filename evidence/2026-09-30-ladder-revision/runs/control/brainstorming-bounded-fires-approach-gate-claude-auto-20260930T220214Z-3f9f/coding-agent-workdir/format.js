// Simple string formatting utility
export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  // Guarded by type rather than truthiness because 0 is a meaningful limit.
  if (typeof options.truncate === "number" && result.length > options.truncate) {
    const ellipsis = "...";

    if (options.truncate <= ellipsis.length) {
      result = ellipsis.slice(0, Math.max(0, options.truncate));
    } else {
      const budget = options.truncate - ellipsis.length;
      // Read one character past the budget so a word ending exactly on the
      // boundary is kept whole instead of backtracking to the previous space.
      const window = result.slice(0, budget + 1);
      const lastSpace = window.lastIndexOf(" ");
      const kept = lastSpace > 0 ? window.slice(0, lastSpace) : result.slice(0, budget);
      result = kept.trimEnd() + ellipsis;
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
