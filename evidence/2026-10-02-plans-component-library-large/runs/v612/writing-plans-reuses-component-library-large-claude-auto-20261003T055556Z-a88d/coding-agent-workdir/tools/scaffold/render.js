import { readFile } from 'node:fs/promises';

// Replaces {{name}} placeholders; an unknown placeholder is an error rather
// than an empty string in generated code.
export async function renderTemplate(path, values) {
  const text = await readFile(path, 'utf8');
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`${path}: no value for {{${key}}}`);
    return values[key];
  });
}
