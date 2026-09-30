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

  // Truncation runs last so the length bound holds on what the caller gets
  // back; a prefix or suffix applied afterwards could push it over.
  if (options.truncate && result.length > options.truncate) {
    const ellipsis = "...";
    const max = options.truncate;

    if (max <= ellipsis.length) {
      result = ellipsis.slice(0, max);
    } else {
      const candidate = result.slice(0, max - ellipsis.length);
      const lastSpace = candidate.lastIndexOf(" ");
      // A boundary at index 0 would leave no text, so fall back to the hard
      // cut there too -- same as when the budget holds no space at all.
      const text = lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;
      result = text.trimEnd() + ellipsis;
    }
  }

  return result;
}
