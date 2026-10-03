import { attrs, cx } from '#kit/utils';

/**
 * Sidebar group body.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarGroupContent({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sidebar__group-content', className)}"${attrs(extra)}>${children}</div>`;
}
