import { attrs, cx } from '#kit/utils';

/**
 * Sidebar inset, the main content area beside it.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarInset({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<main class="${cx('kit-sidebar__inset', className)}"${attrs(extra)}>${children}</main>`;
}
