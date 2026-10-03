// One row per line, so a snapshot diff shows which rows changed.
export function formatSnapshot({ generatedAt, key, rows, extra = {} }) {
  const row = (r) =>
    `    ${JSON.stringify(r).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, '{ ').replace(/\}$/, ' }')}`;
  const more = Object.entries(extra)
    .map(([k, v]) => `  "${k}": ${JSON.stringify(v)},\n`)
    .join('');
  return `{\n  "generatedAt": "${generatedAt}",\n${more}  "${key}": [\n${rows.map(row).join(',\n')}\n  ]\n}\n`;
}

export function snapshotTime(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}
