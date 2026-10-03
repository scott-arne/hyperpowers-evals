import { cx, esc } from '#kit/utils';

/**
 * Date picker trigger, the control that opens it.
 *
 * @param {{label: string, class?: string}} opts
 * @returns {string}
 */
export function datePickerTrigger({ label, class: className = '' }) {
  return `<summary class="${cx('kit-date-picker__trigger', className)}">${esc(label)}</summary>`;
}
