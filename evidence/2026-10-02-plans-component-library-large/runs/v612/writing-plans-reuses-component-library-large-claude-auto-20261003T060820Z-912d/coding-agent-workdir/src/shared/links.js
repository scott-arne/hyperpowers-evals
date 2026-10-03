const WIKI = 'https://wiki.example.com';

// Runbook ids are wiki page slugs.
export function runbookUrl(id) {
  return `${WIKI}/runbooks/${encodeURIComponent(id)}`;
}

export function serviceDocsUrl(service) {
  return `${WIKI}/services/${encodeURIComponent(service)}`;
}
