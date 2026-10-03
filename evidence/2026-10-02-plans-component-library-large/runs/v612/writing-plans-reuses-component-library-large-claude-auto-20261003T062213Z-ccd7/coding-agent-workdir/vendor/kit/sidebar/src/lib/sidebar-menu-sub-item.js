import { attrs, cx } from '#kit/utils';

/**
 * Sidebar nested menu entry.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarMenuSubItem({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<li class="${cx('kit-sidebar__menu-sub-item', className)}"${attrs(extra)}>${children}</li>`;
}
