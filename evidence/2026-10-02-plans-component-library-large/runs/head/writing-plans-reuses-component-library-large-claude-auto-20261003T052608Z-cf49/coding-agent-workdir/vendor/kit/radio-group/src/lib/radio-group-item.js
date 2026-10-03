import { esc } from '#kit/utils';

/**
 * Radio group item.
 *
 * @param {{name: string, value: string, label: string, checked?: boolean}} opts
 * @returns {string}
 */
export function radioGroupItem({ name, value, label, checked = false }) {
  return `<label class="kit-radio-group__item"><input type="radio" name="${esc(name)}" value="${esc(value)}"${checked ? ' checked' : ''}> ${esc(label)}</label>`;
}
