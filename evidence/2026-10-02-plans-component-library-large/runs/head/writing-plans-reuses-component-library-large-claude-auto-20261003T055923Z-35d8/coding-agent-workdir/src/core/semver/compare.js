// Compares "1.23.0" style versions. A pre-release sorts before its release,
// so 1.23.0-rc.1 < 1.23.0; pre-release tags compare as plain strings.
export function compareVersions(a, b) {
  const [coreA, preA] = a.split('-', 2);
  const [coreB, preB] = b.split('-', 2);
  const partsA = coreA.split('.').map(Number);
  const partsB = coreB.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((partsA[i] ?? 0) !== (partsB[i] ?? 0)) return (partsA[i] ?? 0) < (partsB[i] ?? 0) ? -1 : 1;
  }
  if (preA === preB) return 0;
  if (preA === undefined) return 1;
  if (preB === undefined) return -1;
  return preA < preB ? -1 : 1;
}
