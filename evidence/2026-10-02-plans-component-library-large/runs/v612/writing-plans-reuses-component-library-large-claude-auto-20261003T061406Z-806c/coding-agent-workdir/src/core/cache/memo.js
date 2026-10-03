// Memoizes a one-argument function. Pass `key` when the argument is an object
// whose identity changes between equal calls.
export function memoize(fn, key = (arg) => arg) {
  const cache = new Map();
  return (arg) => {
    const k = key(arg);
    if (!cache.has(k)) cache.set(k, fn(arg));
    return cache.get(k);
  };
}
