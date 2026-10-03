import { attrs, cx } from '#kit/utils';

/**
 * Context menu submenu.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function contextMenuSub({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-context-menu__sub', className)}"${attrs(extra)}>${children}</div>`;
}
