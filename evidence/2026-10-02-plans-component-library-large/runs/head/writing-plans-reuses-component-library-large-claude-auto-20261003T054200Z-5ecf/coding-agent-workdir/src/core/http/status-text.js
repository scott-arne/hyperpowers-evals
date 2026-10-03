const TEXT = {
  200: 'OK',
  304: 'Not Modified',
  400: 'Bad Request',
  404: 'Not Found',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export function statusText(status) {
  return TEXT[status] ?? 'Unknown';
}
