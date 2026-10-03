const TYPES = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.html': 'text/html; charset=utf-8',
};

export function contentType(extension) {
  return TYPES[extension] ?? 'application/octet-stream';
}
