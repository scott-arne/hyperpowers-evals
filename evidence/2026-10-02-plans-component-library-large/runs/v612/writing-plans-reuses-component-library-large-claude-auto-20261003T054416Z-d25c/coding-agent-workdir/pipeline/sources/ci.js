// Client for the CI system. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function ciSource({ baseUrl = process.env.CI_URL, http = createHttpClient() } = {}) {
  return {
    auditLog: () => http.getJson(`${baseUrl}/api/v4/audit-log`),
    deploys: () => http.getJson(`${baseUrl}/api/v4/deploys`),
  };
}
