import { attrs, esc } from '#kit/utils';

/**
 * Multi-line text input.
 *
 * @param {{name: string, value?: string, rows?: number, placeholder?: string}} opts
 * @returns {string}
 */
export function textarea({ name, value = '', rows = 3, placeholder = '' }) {
  return `<textarea class="kit-textarea" name="${esc(name)}" rows="${Number(rows) || 3}"${attrs({ placeholder: placeholder || false })}>${esc(value)}</textarea>`;
}
