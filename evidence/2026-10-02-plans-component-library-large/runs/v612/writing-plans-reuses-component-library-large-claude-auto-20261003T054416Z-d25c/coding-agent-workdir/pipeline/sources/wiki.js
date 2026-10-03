// Client for the wiki. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function wikiSource({ baseUrl = process.env.WIKI_URL, http = createHttpClient() } = {}) {
  return {
    reports: () => http.getJson(`${baseUrl}/rest/api/space/OPS/reports`),
    runbooks: () => http.getJson(`${baseUrl}/rest/api/space/OPS/runbooks`),
  };
}
