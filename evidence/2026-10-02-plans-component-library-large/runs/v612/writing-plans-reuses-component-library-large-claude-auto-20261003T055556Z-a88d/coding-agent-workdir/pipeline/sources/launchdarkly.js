// Client for LaunchDarkly. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function launchdarklySource({ baseUrl = process.env.LAUNCHDARKLY_URL, http = createHttpClient() } = {}) {
  return {
    flags: () => http.getJson(`${baseUrl}/api/v2/projects/harbor/flags`),
  };
}
