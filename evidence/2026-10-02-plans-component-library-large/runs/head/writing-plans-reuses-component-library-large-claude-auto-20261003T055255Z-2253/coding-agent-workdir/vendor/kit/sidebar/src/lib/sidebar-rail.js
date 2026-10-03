import { attrs, cx } from '#kit/utils';

/**
 * Sidebar rail, the strip that stays visible when it is collapsed.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarRail({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sidebar__rail', className)}"${attrs(extra)}>${children}</div>`;
}
