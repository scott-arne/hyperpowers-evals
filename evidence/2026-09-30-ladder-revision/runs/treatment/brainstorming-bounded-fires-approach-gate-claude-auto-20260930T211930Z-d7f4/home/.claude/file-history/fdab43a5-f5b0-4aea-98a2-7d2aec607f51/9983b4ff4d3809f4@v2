// Simple string formatting utility

// Cut `str` down to at most `max` characters, ending in '...'. The ellipsis is
// counted inside the budget, so the result never exceeds `max` and the option
// is safe to point at a fixed-width target. The cut prefers the last word
// boundary that fits, falling back to a hard cut so a single long token still
// yields content rather than a bare ellipsis.
function truncateToWordBoundary(str, max) {
  if (str.length <= max) {
    return str;
  }

  if (max <= 3) {
    return '...'.slice(0, max);
  }

  const budget = max - 3;
  const hardCut = str.slice(0, budget);

  // Whitespace at the cut point means the hard cut already lands on a complete
  // word, so searching backwards would drop that word for no reason.
  const boundary = /\s/.test(str[budget])
    ? hardCut.length
    : hardCut.search(/\s+\S*$/);

  const wordCut = boundary === -1 ? '' : hardCut.slice(0, boundary).trimEnd();

  return (wordCut || hardCut) + '...';
}

export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  // A truthiness guard would silently ignore `truncate: 0`.
  if (typeof options.truncate === 'number') {
    result = truncateToWordBoundary(result, options.truncate);
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
