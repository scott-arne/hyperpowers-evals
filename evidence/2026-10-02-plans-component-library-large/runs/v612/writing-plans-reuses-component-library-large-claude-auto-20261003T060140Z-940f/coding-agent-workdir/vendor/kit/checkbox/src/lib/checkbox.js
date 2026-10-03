import { esc } from '#kit/utils';

/**
 * Checkbox with its label.
 *
 * @param {{name: string, label: string, checked?: boolean, value?: string}} opts
 * @returns {string}
 */
export function checkbox({ name, label, checked = false, value = 'on' }) {
  return `<label class="kit-checkbox"><input type="checkbox" name="${esc(name)}" value="${esc(value)}"${checked ? ' checked' : ''}> ${esc(label)}</label>`;
}
