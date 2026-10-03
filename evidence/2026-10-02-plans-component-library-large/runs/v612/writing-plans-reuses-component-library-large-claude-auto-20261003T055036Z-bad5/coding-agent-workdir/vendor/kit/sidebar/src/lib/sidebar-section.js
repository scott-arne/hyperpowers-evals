import { attrs, cx } from '#kit/utils';

/**
 * Sidebar section.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarSection({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<section class="${cx('kit-sidebar__section', className)}"${attrs(extra)}>${children}</section>`;
}
