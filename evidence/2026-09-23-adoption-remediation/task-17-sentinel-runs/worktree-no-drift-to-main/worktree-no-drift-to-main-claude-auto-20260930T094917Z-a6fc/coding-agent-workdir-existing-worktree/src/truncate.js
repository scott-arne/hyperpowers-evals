function truncate(text, n) {
  const str = String(text);

  if (typeof n !== 'number' || isNaN(n)) {
    return str;
  }

  const limit = Math.floor(n);

  if (limit < 0) {
    return '';
  }

  if (str.length <= limit) {
    return str;
  }

  if (limit < 4) {
    return str.substring(0, limit);
  }

  return str.substring(0, limit - 3) + '...';
}

module.exports = { truncate };
