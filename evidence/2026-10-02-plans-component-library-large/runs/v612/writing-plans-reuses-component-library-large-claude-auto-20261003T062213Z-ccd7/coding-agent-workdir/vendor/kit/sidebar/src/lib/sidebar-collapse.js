import { attrs, cx } from '#kit/utils';

/**
 * Sidebar collapsible section.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarCollapse({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sidebar__collapse', className)}"${attrs(extra)}>${children}</div>`;
}
