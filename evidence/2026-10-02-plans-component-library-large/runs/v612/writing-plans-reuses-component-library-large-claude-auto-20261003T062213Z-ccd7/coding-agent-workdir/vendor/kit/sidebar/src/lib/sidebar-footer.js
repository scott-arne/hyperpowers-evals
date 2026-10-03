import { attrs, cx } from '#kit/utils';

/**
 * Sidebar footer.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarFooter({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<footer class="${cx('kit-sidebar__footer', className)}"${attrs(extra)}>${children}</footer>`;
}
