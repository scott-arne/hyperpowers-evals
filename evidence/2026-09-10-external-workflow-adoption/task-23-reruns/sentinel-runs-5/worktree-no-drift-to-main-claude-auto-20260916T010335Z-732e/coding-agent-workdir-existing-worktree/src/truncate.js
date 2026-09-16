const ELLIPSIS = '…';

function truncate(text, n) {
  if (typeof text !== 'string') {
    return '';
  }
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    return '';
  }
  if (text.length <= n) {
    return text;
  }
  // The ellipsis counts toward n, so keep n - 1 characters of the original.
  return text.slice(0, n - 1) + ELLIPSIS;
}

module.exports = { truncate };
