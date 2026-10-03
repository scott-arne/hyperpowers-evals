export class Counter {
  constructor(name) {
    this.name = name;
    this.value = 0;
  }

  inc(by = 1) {
    this.value += by;
  }
}
