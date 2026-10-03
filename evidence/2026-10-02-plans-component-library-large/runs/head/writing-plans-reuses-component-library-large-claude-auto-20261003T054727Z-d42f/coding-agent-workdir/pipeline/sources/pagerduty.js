// Client for PagerDuty. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function pagerdutySource({ baseUrl = process.env.PAGERDUTY_URL, http = createHttpClient() } = {}) {
  return {
    escalationSteps: () => http.getJson(`${baseUrl}/escalation-steps`),
    incidents: () => http.getJson(`${baseUrl}/incidents`),
    rotations: () => http.getJson(`${baseUrl}/rotations`),
  };
}
