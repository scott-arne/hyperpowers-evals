// Keeps the first item for each key, in input order.
export function uniqueBy(list, key = (item) => item) {
  const seen = new Set();
  return list.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
