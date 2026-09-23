function parseAuthToken(header) {
  // Return null for missing or non-string headers
  if (typeof header !== 'string') {
    return null;
  }

  // Trim the header first
  const trimmedHeader = header.trim();

  // Check if header starts with "Bearer " (case-insensitive) followed by whitespace
  const bearerPattern = /^bearer\s+/i;

  if (!bearerPattern.test(trimmedHeader)) {
    return null;
  }

  // Extract the token part (everything after "Bearer " and any spaces)
  const token = trimmedHeader.replace(/^bearer\s+/i, '').trim();

  // Return null for empty tokens
  if (token === '') {
    return null;
  }

  return token;
}

module.exports = { parseAuthToken };
