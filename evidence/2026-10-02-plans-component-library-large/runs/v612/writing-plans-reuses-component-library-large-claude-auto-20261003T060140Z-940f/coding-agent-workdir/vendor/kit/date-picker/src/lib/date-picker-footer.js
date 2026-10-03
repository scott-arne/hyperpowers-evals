import { attrs, cx } from '#kit/utils';

/**
 * Date picker footer.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function datePickerFooter({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<footer class="${cx('kit-date-picker__footer', className)}"${attrs(extra)}>${children}</footer>`;
}
