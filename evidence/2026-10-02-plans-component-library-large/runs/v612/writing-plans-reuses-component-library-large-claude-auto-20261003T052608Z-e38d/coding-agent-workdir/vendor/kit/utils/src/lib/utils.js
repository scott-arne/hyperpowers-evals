// Escapes text for HTML element content and quoted attribute values.
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Joins class names, skipping falsy ones.
export function cx(...names) {
  return names.filter(Boolean).join(' ');
}

// Renders an attribute map as ` name="value"` pairs. true renders the bare
// attribute; false, null and undefined are left out.
export function attrs(map = {}) {
  return Object.entries(map)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k, v]) => (v === true ? ` ${esc(k)}` : ` ${esc(k)}="${esc(v)}"`))
    .join('');
}
