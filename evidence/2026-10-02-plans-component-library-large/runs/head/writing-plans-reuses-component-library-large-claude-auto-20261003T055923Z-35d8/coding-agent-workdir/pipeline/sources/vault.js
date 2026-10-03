// Client for Vault. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function vaultSource({ baseUrl = process.env.VAULT_URL, http = createHttpClient() } = {}) {
  return {
    secrets: () => http.getJson(`${baseUrl}/v1/sys/harbor/secrets`),
    tokens: () => http.getJson(`${baseUrl}/v1/sys/harbor/tokens`),
  };
}
