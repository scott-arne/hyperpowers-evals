export function bumpVersion(version, part) {
  const [major, minor, patch] = version.split('-')[0].split('.').map(Number);
  if (part === 'major') return `${major + 1}.0.0`;
  if (part === 'minor') return `${major}.${minor + 1}.0`;
  if (part === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`unknown part: ${part}`);
}
