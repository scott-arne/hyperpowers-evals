import { attrs, cx } from '#kit/utils';

/**
 * Sheet body.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sheetBody({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sheet__body', className)}"${attrs(extra)}>${children}</div>`;
}
