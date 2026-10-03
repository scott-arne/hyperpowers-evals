// Client for the AWS service quotas API. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function awsSource({ baseUrl = process.env.AWS_URL, http = createHttpClient() } = {}) {
  return {
    quotas: () => http.getJson(`${baseUrl}/quotas/v1/quotas`),
  };
}
