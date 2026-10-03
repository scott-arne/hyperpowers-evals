// Client for the DNS provider. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function dnsSource({ baseUrl = process.env.DNS_URL, http = createHttpClient() } = {}) {
  return {
    domains: () => http.getJson(`${baseUrl}/v2/domains`),
  };
}
