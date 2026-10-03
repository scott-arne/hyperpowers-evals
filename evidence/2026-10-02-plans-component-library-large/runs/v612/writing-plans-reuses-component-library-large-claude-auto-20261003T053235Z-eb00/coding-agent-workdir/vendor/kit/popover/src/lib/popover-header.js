import { attrs, cx } from '#kit/utils';

/**
 * Popover header.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function popoverHeader({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<header class="${cx('kit-popover__header', className)}"${attrs(extra)}>${children}</header>`;
}
