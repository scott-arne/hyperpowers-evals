function truncate(text, n) {
  // Convert non-string inputs to string; treat null/undefined as empty
  if (text == null) {
    text = '';
  } else if (typeof text !== 'string') {
    text = String(text);
  }

  // Handle edge cases for n
  if (n <= 0) {
    return '';
  }

  // No truncation needed
  if (text.length <= n) {
    return text;
  }

  // For very small n, return truncated ellipsis or as much as fits
  const ellipsis = '...';
  if (n <= ellipsis.length) {
    return ellipsis.slice(0, n);
  }

  // Normal truncation: text up to (n - 3) chars + ellipsis
  return text.slice(0, n - ellipsis.length) + ellipsis;
}

module.exports = { truncate };
