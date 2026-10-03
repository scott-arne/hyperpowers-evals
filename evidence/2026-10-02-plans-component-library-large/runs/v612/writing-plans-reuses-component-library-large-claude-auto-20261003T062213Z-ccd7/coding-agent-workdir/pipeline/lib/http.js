import { HttpError } from '../../src/core/errors/http-error.js';
import { retry } from '../../src/core/retry/retry.js';

// GETs JSON with a timeout and a few retries. Upstream APIs flake often
// enough that one failed request should not cost a snapshot its minute.
export function createHttpClient({ fetch = globalThis.fetch, timeoutMs = 10_000, attempts = 3, wait } = {}) {
  return {
    getJson: (url) =>
      retry(
        async () => {
          const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
          if (!res.ok) throw new HttpError(res.status, `GET ${url}: ${res.status}`);
          return res.json();
        },
        { attempts, wait },
      ),
  };
}
