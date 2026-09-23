const ELLIPSIS = '…';

function truncate(text, n) {
  if (typeof text !== 'string') {
    return '';
  }
  // Number.isInteger also rejects non-numbers, NaN, and the infinities.
  if (!Number.isInteger(n) || n <= 0) {
    return '';
  }
  if (text.length <= n) {
    return text;
  }
  // The ellipsis counts against the budget, so trailing whitespace is stripped
  // after slicing. That can leave the result shorter than n, which is fine:
  // n is an upper bound, not a target.
  return `${text.slice(0, n - 1).trimEnd()}${ELLIPSIS}`;
}

module.exports = { truncate };
