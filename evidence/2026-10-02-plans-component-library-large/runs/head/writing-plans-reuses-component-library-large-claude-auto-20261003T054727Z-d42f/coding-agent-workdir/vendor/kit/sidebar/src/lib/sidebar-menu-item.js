import { attrs, cx } from '#kit/utils';

/**
 * Sidebar menu entry.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarMenuItem({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<li class="${cx('kit-sidebar__menu-item', className)}"${attrs(extra)}>${children}</li>`;
}
