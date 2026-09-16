function truncate(text, n) {
  if (typeof text !== 'string' || typeof n !== 'number' || n <= 0) {
    return '';
  }

  if (text.length <= n) {
    return text;
  }

  const ellipsis = '...';
  if (n < ellipsis.length) {
    return ellipsis.slice(0, n);
  }

  return text.slice(0, n - ellipsis.length) + ellipsis;
}

module.exports = { truncate };
