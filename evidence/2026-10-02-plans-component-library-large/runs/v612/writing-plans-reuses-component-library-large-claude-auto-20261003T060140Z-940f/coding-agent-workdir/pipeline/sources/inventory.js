// Client for the host inventory. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function inventorySource({ baseUrl = process.env.INVENTORY_URL, http = createHttpClient() } = {}) {
  return {
    hosts: () => http.getJson(`${baseUrl}/api/hosts`),
    regions: () => http.getJson(`${baseUrl}/api/regions`),
    webhooks: () => http.getJson(`${baseUrl}/api/webhooks`),
  };
}
