import { attrs, cx } from '#kit/utils';

/**
 * Sidebar menu list.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarMenu({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<ul class="${cx('kit-sidebar__menu', className)}"${attrs(extra)}>${children}</ul>`;
}
