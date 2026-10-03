import { attrs, cx } from '#kit/utils';

/**
 * Dropdown menu submenu.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function dropdownMenuSub({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-dropdown-menu__sub', className)}"${attrs(extra)}>${children}</div>`;
}
