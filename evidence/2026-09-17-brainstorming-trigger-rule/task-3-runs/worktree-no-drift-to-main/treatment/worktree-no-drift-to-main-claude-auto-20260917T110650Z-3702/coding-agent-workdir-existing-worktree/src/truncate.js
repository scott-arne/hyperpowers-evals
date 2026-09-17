const ELLIPSIS = '...';

function truncate(text, n) {
  if (typeof text !== 'string') {
    return '';
  }
  if (typeof n !== 'number' || Number.isNaN(n) || n <= 0) {
    return '';
  }
  if (text.length <= n) {
    return text;
  }
  // Too little room for the ellipsis to be meaningful, so hard cut instead.
  if (n < ELLIPSIS.length) {
    return text.slice(0, n);
  }
  return text.slice(0, n - ELLIPSIS.length) + ELLIPSIS;
}

module.exports = { truncate };
