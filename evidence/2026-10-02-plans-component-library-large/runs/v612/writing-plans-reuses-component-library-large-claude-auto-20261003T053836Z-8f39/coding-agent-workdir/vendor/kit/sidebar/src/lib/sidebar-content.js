import { attrs, cx } from '#kit/utils';

/**
 * Sidebar content panel.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarContent({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sidebar__content', className)}"${attrs(extra)}>${children}</div>`;
}
