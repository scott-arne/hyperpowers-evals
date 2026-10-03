// Later items win when two share a key.
export function keyBy(list, key) {
  const out = {};
  for (const item of list) out[key(item)] = item;
  return out;
}
