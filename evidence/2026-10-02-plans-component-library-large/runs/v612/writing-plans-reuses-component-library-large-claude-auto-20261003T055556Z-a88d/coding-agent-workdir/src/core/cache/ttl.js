import { systemClock } from '../time/clock.js';

// Entries expire after `ttlMs`. Expired entries are dropped lazily on read.
export function ttlCache(ttlMs, clock = systemClock) {
  const entries = new Map();
  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (clock.now() >= entry.expiresAt) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.set(key, { value, expiresAt: clock.now() + ttlMs });
    },
    clear() {
      entries.clear();
    },
  };
}
