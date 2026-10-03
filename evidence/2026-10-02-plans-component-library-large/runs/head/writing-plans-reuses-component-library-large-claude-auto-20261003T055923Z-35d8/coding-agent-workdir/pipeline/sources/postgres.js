// Client for the database fleet API. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function postgresSource({ baseUrl = process.env.POSTGRES_URL, http = createHttpClient() } = {}) {
  return {
    backups: () => http.getJson(`${baseUrl}/fleet/v1/backups`),
    instances: () => http.getJson(`${baseUrl}/fleet/v1/instances`),
  };
}
