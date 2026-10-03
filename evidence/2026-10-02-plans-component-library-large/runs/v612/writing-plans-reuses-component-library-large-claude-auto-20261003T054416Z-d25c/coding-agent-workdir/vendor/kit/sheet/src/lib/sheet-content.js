import { attrs, cx } from '#kit/utils';

/**
 * Sheet content panel.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sheetContent({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sheet__content', className)}" role="dialog"${attrs(extra)}>${children}</div>`;
}
