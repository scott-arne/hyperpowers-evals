import { cx, esc } from '#kit/utils';

/**
 * Date picker label.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function datePickerLabel({ text, class: className = '' }) {
  return `<span class="${cx('kit-date-picker__label', className)}">${esc(text)}</span>`;
}
