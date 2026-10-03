// Client for Prometheus. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function prometheusSource({ baseUrl = process.env.PROMETHEUS_URL, http = createHttpClient() } = {}) {
  return {
    endpoints: () => http.getJson(`${baseUrl}/api/v1/harbor/endpoints`),
    slos: () => http.getJson(`${baseUrl}/api/v1/harbor/slos`),
  };
}
