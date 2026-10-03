// Stops at the shorter list.
export function zip(a, b) {
  return a.slice(0, Math.min(a.length, b.length)).map((item, i) => [item, b[i]]);
}
