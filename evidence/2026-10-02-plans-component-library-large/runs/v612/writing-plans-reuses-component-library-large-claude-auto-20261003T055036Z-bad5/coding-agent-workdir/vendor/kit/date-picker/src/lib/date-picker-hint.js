import { cx, esc } from '#kit/utils';

/**
 * Date picker hint text.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function datePickerHint({ text, class: className = '' }) {
  return `<p class="${cx('kit-date-picker__hint', className)}">${esc(text)}</p>`;
}
