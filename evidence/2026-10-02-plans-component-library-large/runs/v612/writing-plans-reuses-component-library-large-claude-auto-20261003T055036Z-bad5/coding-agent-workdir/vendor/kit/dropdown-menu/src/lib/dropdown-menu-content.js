import { attrs, cx } from '#kit/utils';

/**
 * Dropdown menu content panel.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function dropdownMenuContent({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-dropdown-menu__content', className)}" role="menu"${attrs(extra)}>${children}</div>`;
}
