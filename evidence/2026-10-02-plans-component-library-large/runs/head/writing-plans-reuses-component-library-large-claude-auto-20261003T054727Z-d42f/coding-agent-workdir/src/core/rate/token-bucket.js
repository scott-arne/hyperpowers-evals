import { systemClock } from '../time/clock.js';

// Allows bursts up to `capacity`, refilling `perSecond` tokens a second.
export function tokenBucket({ capacity, perSecond, clock = systemClock }) {
  let tokens = capacity;
  let last = clock.now();
  return {
    take() {
      const now = clock.now();
      tokens = Math.min(capacity, tokens + ((now - last) / 1000) * perSecond);
      last = now;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
  };
}
