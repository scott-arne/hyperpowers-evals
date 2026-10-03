import { attrs, cx } from '#kit/utils';

/**
 * Date picker pair of range fields.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function datePickerRange({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-date-picker__range', className)}"${attrs(extra)}>${children}</div>`;
}
