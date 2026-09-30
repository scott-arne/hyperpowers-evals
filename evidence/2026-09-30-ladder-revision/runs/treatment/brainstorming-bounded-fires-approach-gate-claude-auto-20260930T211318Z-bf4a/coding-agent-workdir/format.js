// Simple string formatting utility
const ELLIPSIS = "...";

// Shortens str to at most maxLength characters, ending in an ellipsis. The
// ellipsis counts against the budget, so the result never exceeds maxLength.
function truncate(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }

  // Below the ellipsis width there is no room for content at all.
  if (maxLength <= ELLIPSIS.length) {
    return ELLIPSIS.slice(0, maxLength);
  }

  const budget = maxLength - ELLIPSIS.length;
  const window = str.slice(0, budget);

  // Cutting at whitespace already gives a whole word; otherwise back up to the
  // last word boundary. An unbroken token (a URL, say) offers none, and backing
  // up past every character would leave nothing, so both take the hard cut.
  const boundary = /\s/.test(str[budget]) ? budget : window.search(/\s+\S*$/);
  const shortened = boundary === -1 ? "" : window.slice(0, boundary).trimEnd();

  return (shortened === "" ? window.trimEnd() : shortened) + ELLIPSIS;
}

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

  // Last, so the cap holds for what the caller actually gets back. Guarded on
  // the type rather than truthiness because 0 is a valid cap.
  if (typeof options.maxLength === "number" && options.maxLength >= 0) {
    result = truncate(result, options.maxLength);
  }

  return result;
}
