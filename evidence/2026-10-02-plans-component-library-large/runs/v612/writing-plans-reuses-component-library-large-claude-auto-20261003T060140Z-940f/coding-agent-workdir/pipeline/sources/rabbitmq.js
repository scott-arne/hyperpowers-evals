// Client for the RabbitMQ management API. Each method resolves to the parsed JSON body.
import { createHttpClient } from '../lib/http.js';

export function rabbitmqSource({ baseUrl = process.env.RABBITMQ_URL, http = createHttpClient() } = {}) {
  return {
    queues: () => http.getJson(`${baseUrl}/api/queues`),
  };
}
