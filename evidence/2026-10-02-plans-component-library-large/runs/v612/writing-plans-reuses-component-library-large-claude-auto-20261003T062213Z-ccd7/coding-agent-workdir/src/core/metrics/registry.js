import { Counter } from './counter.js';
import { Histogram } from './histogram.js';

export function createRegistry() {
  const metrics = new Map();
  const get = (name, Make) => {
    if (!metrics.has(name)) metrics.set(name, new Make(name));
    return metrics.get(name);
  };
  return {
    counter: (name) => get(name, Counter),
    histogram: (name) => get(name, Histogram),
    all: () => [...metrics.values()],
  };
}
