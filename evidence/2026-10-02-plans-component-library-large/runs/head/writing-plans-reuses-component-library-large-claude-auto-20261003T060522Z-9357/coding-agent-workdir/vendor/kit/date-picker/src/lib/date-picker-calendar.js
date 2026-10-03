import { attrs, cx } from '#kit/utils';

/**
 * Date picker calendar slot.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function datePickerCalendar({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-date-picker__calendar', className)}"${attrs(extra)}>${children}</div>`;
}
