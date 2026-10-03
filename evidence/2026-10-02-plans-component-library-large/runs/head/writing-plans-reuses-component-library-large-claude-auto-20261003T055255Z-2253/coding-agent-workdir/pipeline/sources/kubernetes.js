// Client for the Kubernetes API. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function kubernetesSource({ baseUrl = process.env.KUBERNETES_URL, http = createHttpClient() } = {}) {
  return {
    clusters: () => http.getJson(`${baseUrl}/apis/harbor/v1/clusters`),
    cronJobs: () => http.getJson(`${baseUrl}/apis/harbor/v1/cron-jobs`),
    deployments: () => http.getJson(`${baseUrl}/apis/harbor/v1/deployments`),
  };
}
