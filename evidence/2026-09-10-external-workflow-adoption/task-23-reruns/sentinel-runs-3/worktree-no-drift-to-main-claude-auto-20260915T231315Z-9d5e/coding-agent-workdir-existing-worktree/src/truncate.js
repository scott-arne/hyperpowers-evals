const ELLIPSIS = '...';

// Shortens text to at most n characters. The ellipsis counts toward the
// budget, so a truncated result is exactly n characters long. Text that
// already fits is returned unchanged, without an ellipsis. When n is too
// small to hold the ellipsis, a partial ellipsis is returned; n of 0 or
// less yields an empty string.
function truncate(text, n) {
  if (typeof text !== 'string') {
    throw new TypeError('truncate: text must be a string');
  }
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new TypeError('truncate: n must be a finite number');
  }

  if (n <= 0) {
    return '';
  }
  if (text.length <= n) {
    return text;
  }
  if (n <= ELLIPSIS.length) {
    return ELLIPSIS.slice(0, n);
  }

  return text.slice(0, n - ELLIPSIS.length) + ELLIPSIS;
}

module.exports = { truncate };
