import { setTimeout as sleep } from 'node:timers/promises';
import { backoff } from './backoff.js';

export async function retry(fn, { attempts = 3, delay = (n) => backoff(n), wait = sleep } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await wait(delay(attempt));
    }
  }
  throw lastError;
}
