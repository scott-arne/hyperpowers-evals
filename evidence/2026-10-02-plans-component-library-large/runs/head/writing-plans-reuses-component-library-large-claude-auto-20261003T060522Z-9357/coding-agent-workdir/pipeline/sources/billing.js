// Client for the billing export. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function billingSource({ baseUrl = process.env.BILLING_URL, http = createHttpClient() } = {}) {
  return {
    budgets: () => http.getJson(`${baseUrl}/v1/budgets`),
  };
}
