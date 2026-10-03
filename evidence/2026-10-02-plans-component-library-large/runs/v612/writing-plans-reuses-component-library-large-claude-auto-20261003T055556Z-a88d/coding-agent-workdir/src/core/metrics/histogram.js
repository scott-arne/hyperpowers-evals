// Fixed buckets, cumulative like Prometheus. Upper bounds in milliseconds.
export class Histogram {
  constructor(name, bounds = [5, 10, 25, 50, 100, 250, 500, 1000]) {
    this.name = name;
    this.bounds = bounds;
    this.counts = new Array(bounds.length + 1).fill(0);
    this.sum = 0;
  }

  observe(value) {
    this.sum += value;
    const i = this.bounds.findIndex((bound) => value <= bound);
    this.counts[i === -1 ? this.bounds.length : i] += 1;
  }
}
