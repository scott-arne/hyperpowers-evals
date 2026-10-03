import { esc } from '#kit/utils';

/**
 * On/off switch, a checkbox styled as a track and thumb.
 *
 * @param {{name: string, label: string, checked?: boolean}} opts
 * @returns {string}
 */
export function switchControl({ name, label, checked = false }) {
  return `<label class="kit-switch"><input type="checkbox" role="switch" name="${esc(name)}"${checked ? ' checked' : ''}><span class="kit-switch__track"><span class="kit-switch__thumb"></span></span> ${esc(label)}</label>`;
}
