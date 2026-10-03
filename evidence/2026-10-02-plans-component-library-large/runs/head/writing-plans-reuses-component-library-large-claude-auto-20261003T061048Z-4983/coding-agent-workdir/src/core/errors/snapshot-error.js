// Raised by the pipeline when a snapshot fails validation, so the old file
// stays in place rather than being replaced with a broken one.
export class SnapshotError extends Error {
  constructor(name, problems) {
    super(`${name}: ${problems.length} problem(s): ${problems.join('; ')}`);
    this.name = 'SnapshotError';
    this.snapshot = name;
    this.problems = problems;
  }
}
