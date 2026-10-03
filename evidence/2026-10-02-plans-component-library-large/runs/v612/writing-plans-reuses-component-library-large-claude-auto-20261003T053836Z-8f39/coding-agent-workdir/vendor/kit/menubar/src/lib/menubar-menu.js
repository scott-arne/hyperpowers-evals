import { attrs, cx } from '#kit/utils';

/**
 * Menubar menu list.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function menubarMenu({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-menubar__menu', className)}"${attrs(extra)}>${children}</div>`;
}
