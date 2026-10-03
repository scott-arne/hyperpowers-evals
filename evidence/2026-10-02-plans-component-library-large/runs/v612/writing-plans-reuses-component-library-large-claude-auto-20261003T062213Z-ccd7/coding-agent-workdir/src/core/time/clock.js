// Code that needs the time takes a clock, so tests can pin it.
export const systemClock = { now: () => Date.now() };

export function fixedClock(ms) {
  let now = ms;
  return {
    now: () => now,
    advance: (by) => {
      now += by;
    },
  };
}
