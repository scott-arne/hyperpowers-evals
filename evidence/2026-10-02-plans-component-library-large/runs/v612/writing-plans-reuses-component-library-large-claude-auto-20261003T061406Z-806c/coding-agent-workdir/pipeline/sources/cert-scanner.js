// Client for the certificate scanner. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function certScannerSource({ baseUrl = process.env.CERT_SCANNER_URL, http = createHttpClient() } = {}) {
  return {
    certificates: () => http.getJson(`${baseUrl}/api/certificates`),
  };
}
