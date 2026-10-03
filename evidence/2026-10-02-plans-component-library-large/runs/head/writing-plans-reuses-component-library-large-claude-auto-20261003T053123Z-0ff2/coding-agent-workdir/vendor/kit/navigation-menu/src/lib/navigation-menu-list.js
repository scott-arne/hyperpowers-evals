import { attrs, cx } from '#kit/utils';

/**
 * Navigation menu list.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function navigationMenuList({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<ul class="${cx('kit-navigation-menu__list', className)}"${attrs(extra)}>${children}</ul>`;
}
