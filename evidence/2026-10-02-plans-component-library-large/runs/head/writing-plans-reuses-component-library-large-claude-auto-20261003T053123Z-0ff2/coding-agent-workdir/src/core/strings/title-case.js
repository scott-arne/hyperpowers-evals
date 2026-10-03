const SMALL = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);

export function titleCase(text) {
  return text
    .split(/\s+/)
    .map((word, i) => (i > 0 && SMALL.has(word) ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}
