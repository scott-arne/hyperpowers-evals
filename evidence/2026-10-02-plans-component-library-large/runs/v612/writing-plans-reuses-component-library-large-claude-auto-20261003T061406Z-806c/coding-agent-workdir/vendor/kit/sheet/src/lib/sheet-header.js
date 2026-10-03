import { attrs, cx } from '#kit/utils';

/**
 * Sheet header.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sheetHeader({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<header class="${cx('kit-sheet__header', className)}"${attrs(extra)}>${children}</header>`;
}
