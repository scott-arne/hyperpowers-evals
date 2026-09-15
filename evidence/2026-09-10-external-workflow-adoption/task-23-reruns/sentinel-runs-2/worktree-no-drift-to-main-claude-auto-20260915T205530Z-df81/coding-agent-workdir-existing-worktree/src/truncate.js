const ELLIPSIS = '…';

function truncate(text, n) {
  if (typeof text !== 'string') {
    return '';
  }
  // A non-numeric or non-positive limit leaves no room for any output,
  // not even the ellipsis, so the only sensible result is an empty string.
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    return '';
  }
  if (text.length <= n) {
    return text;
  }
  return text.slice(0, n - 1) + ELLIPSIS;
}

module.exports = { truncate };
