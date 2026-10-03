import { attrs, cx } from '#kit/utils';

/**
 * Month calendar.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function calendar({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-calendar', className)}"${attrs(extra)}>${children}</div>`;
}
