import { attrs, cx } from '#kit/utils';

/**
 * Date picker popover panel.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function datePickerPopover({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-date-picker__popover', className)}"${attrs(extra)}>${children}</div>`;
}
