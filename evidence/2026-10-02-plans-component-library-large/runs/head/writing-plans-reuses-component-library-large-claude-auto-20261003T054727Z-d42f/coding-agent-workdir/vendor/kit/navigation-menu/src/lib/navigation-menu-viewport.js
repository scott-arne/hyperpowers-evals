import { attrs, cx } from '#kit/utils';

/**
 * Navigation menu viewport the content renders into.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function navigationMenuViewport({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-navigation-menu__viewport', className)}"${attrs(extra)}>${children}</div>`;
}
