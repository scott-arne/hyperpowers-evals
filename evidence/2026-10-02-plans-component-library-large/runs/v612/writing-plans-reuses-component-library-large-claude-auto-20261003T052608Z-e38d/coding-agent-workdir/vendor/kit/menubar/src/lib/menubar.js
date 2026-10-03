import { attrs, cx } from '#kit/utils';

/**
 * Horizontal bar of menus, as in a desktop application.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function menubar({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-menubar', className)}"${attrs(extra)}>${children}</div>`;
}
