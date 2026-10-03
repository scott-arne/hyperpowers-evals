import { attrs, cx } from '#kit/utils';

/**
 * Dropdown menu group of mutually exclusive items.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function dropdownMenuRadioGroup({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-dropdown-menu__radio-group', className)}" role="group"${attrs(extra)}>${children}</div>`;
}
