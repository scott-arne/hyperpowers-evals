import { attrs, cx } from '#kit/utils';

/**
 * Sidebar nested menu.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarMenuSub({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<ul class="${cx('kit-sidebar__menu-sub', className)}"${attrs(extra)}>${children}</ul>`;
}
