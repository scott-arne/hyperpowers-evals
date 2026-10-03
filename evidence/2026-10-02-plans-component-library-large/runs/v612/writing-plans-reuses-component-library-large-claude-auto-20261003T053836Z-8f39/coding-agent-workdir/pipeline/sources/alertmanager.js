// Client for Alertmanager. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function alertmanagerSource({ baseUrl = process.env.ALERTMANAGER_URL, http = createHttpClient() } = {}) {
  return {
    alerts: () => http.getJson(`${baseUrl}/api/v2/alerts`),
  };
}
