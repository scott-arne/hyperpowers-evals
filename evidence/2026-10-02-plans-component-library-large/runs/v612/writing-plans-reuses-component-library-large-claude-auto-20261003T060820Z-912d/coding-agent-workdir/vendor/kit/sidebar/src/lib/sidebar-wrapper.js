import { attrs, cx } from '#kit/utils';

/**
 * Sidebar wrapper, which lays it out next to the inset.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarWrapper({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sidebar__wrapper', className)}"${attrs(extra)}>${children}</div>`;
}
