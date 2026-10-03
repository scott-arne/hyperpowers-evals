// Client for GitHub. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function githubSource({ baseUrl = process.env.GITHUB_URL, http = createHttpClient() } = {}) {
  return {
    changeRequests: () => http.getJson(`${baseUrl}/api/v3/orgs/harbor/change-requests`),
    teams: () => http.getJson(`${baseUrl}/api/v3/orgs/harbor/teams`),
  };
}
