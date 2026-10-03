// Groups commit subjects by their "Area: " prefix; unprefixed ones go under
// Dashboard, where most of them land.
export function changelogSection(version, date, subjects) {
  const groups = new Map();
  for (const subject of subjects) {
    const match = /^([A-Z][a-z]+): (.+)$/.exec(subject);
    const [area, text] = match ? [match[1], match[2]] : ['Dashboard', subject];
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push(text);
  }
  const body = [...groups].map(([area, items]) => `### ${area}\n\n${items.map((i) => `- ${i}`).join('\n')}\n`);
  return `## ${version} (${date})\n\n${body.join('\n')}`;
}
