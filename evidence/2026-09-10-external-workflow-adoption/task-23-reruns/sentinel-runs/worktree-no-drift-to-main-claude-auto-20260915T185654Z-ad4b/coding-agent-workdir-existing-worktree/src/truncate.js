function truncate(text, n) {
  if (typeof text !== 'string') {
    return '';
  }

  if (n <= 0) {
    return '';
  }

  if (n <= 3) {
    return '...'.slice(0, n);
  }

  if (text.length <= n) {
    return text;
  }

  return text.slice(0, n - 3) + '...';
}

module.exports = { truncate };
