function parseAuthToken(header) {
  if (header === null || header === undefined) {
    return null;
  }

  if (typeof header !== 'string') {
    return null;
  }

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice(7).trim();

  if (token === '') {
    return null;
  }

  return token;
}

module.exports = { parseAuthToken };
