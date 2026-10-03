import { esc } from '#kit/utils';

/**
 * Input group multi-line input.
 *
 * @param {{name: string, value?: string, rows?: number}} opts
 * @returns {string}
 */
export function inputGroupTextarea({ name, value = '', rows = 3 }) {
  return `<textarea class="kit-input-group__textarea" name="${esc(name)}" rows="${Number(rows) || 3}">${esc(value)}</textarea>`;
}
