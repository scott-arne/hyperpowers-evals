// Client for Statuspage. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function statuspageSource({ baseUrl = process.env.STATUSPAGE_URL, http = createHttpClient() } = {}) {
  return {
    components: () => http.getJson(`${baseUrl}/v1/pages/harbor/components`),
    maintenances: () => http.getJson(`${baseUrl}/v1/pages/harbor/maintenances`),
    vendors: () => http.getJson(`${baseUrl}/v1/pages/harbor/vendors`),
  };
}
